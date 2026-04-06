'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ref, get, update, push, set, remove } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRutas } from '@/features/routes/services/rutas.service'
import type { Usuario, Ruta, Parada } from '@/shared/types'

const ORG_DEMO = 'org-demo-001'

// ─── Tipos para import ──────────────────────────────────────────────────────
interface UsuarioImport {
  nombre: string
  telefono: string
  rol: 'trabajador' | 'chofer'
  rutaNombre?: string   // se resuelve a rutaId en el paso de confirmación
  _error?: string
}

export default function AdminUsuariosPage() {
  const { autenticado, cargando } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'trabajador' | 'chofer'>('todos')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  // Modal nuevo usuario
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', telefono: '+52', rol: 'trabajador' as 'trabajador' | 'chofer', rutaAsignada: '', paradaAsignada: '' })
  // Import masivo
  const [importPreview, setImportPreview] = useState<UsuarioImport[] | null>(null)
  const [importando, setImportando] = useState(false)
  const [importResultado, setImportResultado] = useState<{ ok: number; errores: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/admin')
  }, [autenticado, cargando, router])

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true)
    const [snapUsuarios, rutasData] = await Promise.all([
      get(ref(db, 'usuarios')),
      obtenerRutas(ORG_DEMO),
    ])
    if (snapUsuarios.exists()) {
      const todos = Object.values(snapUsuarios.val() as Record<string, Usuario>)
        .filter(u => u.orgId === ORG_DEMO)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      setUsuarios(todos)
    }
    setRutas(rutasData)
    setCargandoDatos(false)
  }, [])

  useEffect(() => {
    if (autenticado) cargarDatos()
  }, [autenticado, cargarDatos])

  async function handleEliminarUsuario(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    setEliminandoId(userId)
    await remove(ref(db, `usuarios/${userId}`))
    setUsuarios(prev => prev.filter(u => u.id !== userId))
    setEliminandoId(null)
  }

  async function handleAsignarRuta(userId: string, rutaId: string) {
    setGuardandoId(userId)
    await update(ref(db, `usuarios/${userId}`), { rutaAsignada: rutaId, paradaAsignada: '' })
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rutaAsignada: rutaId, paradaAsignada: '' } : u))
    setGuardandoId(null)
  }

  async function handleAsignarParada(userId: string, paradaId: string) {
    setGuardandoId(userId)
    await update(ref(db, `usuarios/${userId}`), { paradaAsignada: paradaId })
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, paradaAsignada: paradaId } : u))
    setGuardandoId(null)
  }

  async function handleCrearUsuario() {
    if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.telefono.trim()) return
    const newRef = push(ref(db, 'usuarios'))
    const id = newRef.key!
    await set(newRef, {
      id,
      nombre: nuevoUsuario.nombre,
      telefono: nuevoUsuario.telefono,
      orgId: ORG_DEMO,
      rol: nuevoUsuario.rol,
      rutaAsignada: nuevoUsuario.rutaAsignada || undefined,
      paradaAsignada: nuevoUsuario.paradaAsignada || undefined,
      creadoEn: Date.now(),
    })
    setMostrarModal(false)
    setNuevoUsuario({ nombre: '', telefono: '+52', rol: 'trabajador', rutaAsignada: '', paradaAsignada: '' })
    await cargarDatos()
  }

  // ── Descargar plantilla Excel ──────────────────────────────────────────────
  async function handleDescargarPlantilla() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Trabajadores')

    ws.columns = [
      { header: 'nombre',   key: 'nombre',    width: 25 },
      { header: 'telefono', key: 'telefono',  width: 18 },
      { header: 'rol',      key: 'rol',       width: 14 },
      { header: 'ruta',     key: 'ruta',      width: 25 },
    ]

    // Estilo de encabezado
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }

    // Filas de ejemplo
    ws.addRow({ nombre: 'Juan Pérez García',   telefono: '+528441234567', rol: 'trabajador', ruta: 'Ruta Matutina Norte' })
    ws.addRow({ nombre: 'María López Sánchez', telefono: '+528449876543', rol: 'trabajador', ruta: 'Ruta Matutina Norte' })
    ws.addRow({ nombre: 'Carlos Ruiz Díaz',    telefono: '+528445551234', rol: 'chofer',     ruta: 'Ruta Matutina Norte' })

    // Validación de rol en columna C
    ws.getColumn('rol').eachCell({ includeEmpty: false }, (cell, row) => {
      if (row > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"trabajador,chofer"'],
          showErrorMessage: true,
          errorTitle: 'Rol inválido',
          error: 'Usa: trabajador o chofer',
        }
      }
    })

    // Nota informativa
    ws.getCell('F1').value = 'Columna "ruta" es opcional. Debe coincidir exactamente con el nombre de una ruta en el sistema.'
    ws.getCell('F1').font = { italic: true, color: { argb: 'FF6B7280' } }

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-trabajadores-clickgo.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Leer Excel y generar preview ───────────────────────────────────────────
  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const buffer = await file.arrayBuffer()
    await wb.xlsx.load(buffer)

    const ws = wb.worksheets[0]
    if (!ws) return

    // Leer encabezados de la primera fila
    const headers: string[] = []
    ws.getRow(1).eachCell(cell => headers.push(String(cell.value ?? '').toLowerCase().trim()))

    const iNombre   = headers.indexOf('nombre')
    const iTelefono = headers.indexOf('telefono')
    const iRol      = headers.indexOf('rol')
    const iRuta     = headers.indexOf('ruta')

    const filas: UsuarioImport[] = []
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const nombre   = String(row.getCell(iNombre   + 1).value ?? '').trim()
      const telefono = String(row.getCell(iTelefono + 1).value ?? '').trim()
      const rolRaw   = String(row.getCell(iRol      + 1).value ?? '').trim().toLowerCase()
      const rutaNombre = iRuta >= 0 ? String(row.getCell(iRuta + 1).value ?? '').trim() : ''

      if (!nombre && !telefono) return // fila vacía

      const rol = (rolRaw === 'chofer' ? 'chofer' : 'trabajador') as 'trabajador' | 'chofer'
      let _error: string | undefined

      if (!nombre) _error = 'Falta nombre'
      else if (!telefono) _error = 'Falta teléfono'
      else if (!telefono.startsWith('+')) _error = 'Teléfono debe empezar con +'

      filas.push({ nombre, telefono, rol, rutaNombre: rutaNombre || undefined, _error })
    })

    setImportPreview(filas)
    setImportResultado(null)
  }

  // ── Confirmar import ───────────────────────────────────────────────────────
  async function handleConfirmarImport() {
    if (!importPreview) return
    setImportando(true)

    // Mapa de nombre de ruta → id
    const rutaMap = new Map(rutas.map(r => [r.nombre.toLowerCase(), r.id]))

    let ok = 0
    let errores = 0

    for (const fila of importPreview) {
      if (fila._error) { errores++; continue }
      const rutaId = fila.rutaNombre ? (rutaMap.get(fila.rutaNombre.toLowerCase()) ?? undefined) : undefined
      const newRef = push(ref(db, 'usuarios'))
      const id = newRef.key!
      await set(newRef, {
        id,
        nombre: fila.nombre,
        telefono: fila.telefono,
        orgId: ORG_DEMO,
        rol: fila.rol,
        rutaAsignada: rutaId,
        creadoEn: Date.now(),
      })
      ok++
    }

    setImportResultado({ ok, errores })
    setImportPreview(null)
    setImportando(false)
    await cargarDatos()
  }

  const usuariosFiltrados = usuarios.filter(u => filtro === 'todos' ? true : u.rol === filtro)

  function getParadasDeRuta(rutaId: string): Parada[] {
    return rutas.find(r => r.id === rutaId)?.paradas ?? []
  }

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashboard')} className="text-teal-200">←</button>
          <div>
            <h1 className="font-bold">Trabajadores</h1>
            <p className="text-teal-200 text-xs">{usuariosFiltrados.length} usuarios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Importar Excel */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleArchivoSeleccionado}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl text-sm font-medium"
          >
            📥 Importar
          </button>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-white text-teal-700 px-3 py-1.5 rounded-xl text-sm font-medium"
          >
            + Agregar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Resultado import */}
        {importResultado && (
          <div className={`rounded-2xl p-4 flex items-center justify-between ${importResultado.errores > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <div>
              <p className="font-semibold text-gray-800">Importación completada</p>
              <p className="text-sm text-gray-600">
                {importResultado.ok} importados{importResultado.errores > 0 ? ` · ${importResultado.errores} con errores omitidos` : ''}
              </p>
            </div>
            <button onClick={() => setImportResultado(null)} className="text-gray-400 text-lg">✕</button>
          </div>
        )}

        {/* Banner descarga plantilla */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-teal-700 text-sm">¿Tienes una lista en Excel? Usa nuestra plantilla</p>
          <button
            onClick={handleDescargarPlantilla}
            className="text-teal-700 font-semibold text-sm underline shrink-0"
          >
            Descargar plantilla
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['todos', 'trabajador', 'chofer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                filtro === f ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'trabajador' ? '👷 Trabajadores' : '🚌 Choferes'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {cargandoDatos ? (
          [1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)
        ) : usuariosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-gray-500">No hay usuarios en esta categoría</p>
          </div>
        ) : (
          usuariosFiltrados.map(usuario => {
            const rutaAsignada = rutas.find(r => r.id === usuario.rutaAsignada)
            const paradaAsignada = getParadasDeRuta(usuario.rutaAsignada ?? '').find(p => p.id === usuario.paradaAsignada)
            const guardando = guardandoId === usuario.id

            return (
              <div key={usuario.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{usuario.nombre || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-400">{usuario.telefono}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      usuario.rol === 'chofer' ? 'bg-blue-100 text-blue-700' :
                      usuario.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {usuario.rol}
                    </span>
                    {usuario.rol !== 'admin' && (
                      <button
                        onClick={() => handleEliminarUsuario(usuario.id)}
                        disabled={eliminandoId === usuario.id}
                        className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Eliminar usuario"
                      >
                        {eliminandoId === usuario.id ? '...' : '🗑'}
                      </button>
                    )}
                  </div>
                </div>

                {usuario.rol !== 'admin' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Ruta asignada</label>
                      <select
                        value={usuario.rutaAsignada ?? ''}
                        onChange={e => handleAsignarRuta(usuario.id, e.target.value)}
                        disabled={guardando}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                      >
                        <option value="">— Sin asignar —</option>
                        {rutas.map(r => (
                          <option key={r.id} value={r.id}>{r.nombre} ({r.turno})</option>
                        ))}
                      </select>
                    </div>

                    {usuario.rol === 'trabajador' && usuario.rutaAsignada && (
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Parada asignada</label>
                        <select
                          value={usuario.paradaAsignada ?? ''}
                          onChange={e => handleAsignarParada(usuario.id, e.target.value)}
                          disabled={guardando}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                        >
                          <option value="">— Sin parada —</option>
                          {getParadasDeRuta(usuario.rutaAsignada).map(p => (
                            <option key={p.id} value={p.id}>{p.orden}. {p.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {rutaAsignada && (
                      <div className="bg-teal-50 rounded-xl px-3 py-2 text-xs text-teal-700">
                        ✅ {rutaAsignada.nombre}
                        {paradaAsignada && ` → ${paradaAsignada.nombre}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>

      {/* Modal nuevo usuario */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Nuevo usuario</h2>
            <input
              placeholder="Nombre completo"
              value={nuevoUsuario.nombre}
              onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              placeholder="Teléfono (+521234567890)"
              value={nuevoUsuario.telefono}
              onChange={e => setNuevoUsuario(p => ({ ...p, telefono: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="grid grid-cols-2 gap-2">
              {(['trabajador', 'chofer'] as const).map(rol => (
                <button
                  key={rol}
                  onClick={() => setNuevoUsuario(p => ({ ...p, rol }))}
                  className={`py-2 rounded-xl text-sm font-medium border ${
                    nuevoUsuario.rol === rol ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {rol === 'trabajador' ? '👷 Trabajador' : '🚌 Chofer'}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setMostrarModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleCrearUsuario}
                disabled={!nuevoUsuario.nombre.trim()}
                className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-medium disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview import */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 overflow-hidden">
          <div className="bg-white w-full max-w-md rounded-t-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Vista previa — {importPreview.length} filas</h2>
                <p className="text-xs text-gray-400">
                  {importPreview.filter(f => !f._error).length} válidas ·{' '}
                  {importPreview.filter(f => !!f._error).length} con errores
                </p>
              </div>
              <button onClick={() => setImportPreview(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {importPreview.map((fila, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2.5 text-sm ${fila._error ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 truncate">{fila.nombre || '—'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                      fila.rol === 'chofer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                    }`}>{fila.rol}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{fila.telefono}</p>
                  {fila.rutaNombre && <p className="text-teal-600 text-xs">📍 {fila.rutaNombre}</p>}
                  {fila._error && <p className="text-red-500 text-xs mt-1">⚠ {fila._error}</p>}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setImportPreview(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarImport}
                disabled={importando || importPreview.filter(f => !f._error).length === 0}
                className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importando ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importando...</>
                ) : (
                  `Confirmar ${importPreview.filter(f => !f._error).length} usuarios`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
