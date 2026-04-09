'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ref, get, update, push, set, remove } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRutas } from '@/features/routes/services/rutas.service'
import type { Usuario, Ruta, Parada, Preregistro } from '@/shared/types'
import { listarPreregistros, crearPreregistro, eliminarPreregistro } from '@/shared/lib/firebase/database'

const ORG_DEMO = 'org-demo-001'

// ─── Tipos para import ──────────────────────────────────────────────────────
interface PreregistroImport {
  empleadoId: string
  rutaNombre?: string
  paradaNombre?: string
  _error?: string
}

interface UsuarioImport {
  nombre: string
  telefono: string
  rol: 'trabajador' | 'chofer'
  rutaNombre?: string
  _error?: string
}

export default function AdminUsuariosPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [vista, setVista] = useState<'usuarios' | 'preregistros'>('usuarios')
  const [filtro, setFiltro] = useState<'todos' | 'trabajador' | 'chofer'>('todos')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  // Modal nuevo usuario (solo operadores)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', telefono: '+52', rol: 'chofer' as 'trabajador' | 'chofer', rutaAsignada: '', paradaAsignada: '', numeroUnidad: '' })
  // Preregistros
  const [preregistros, setPreregistros] = useState<Preregistro[]>([])
  const [cargandoPreregistros, setCargandoPreregistros] = useState(false)
  const [nuevoPreregistro, setNuevoPreregistro] = useState({ empleadoId: '', rutaAsignada: '', paradaAsignada: '' })
  const [guardandoPreregistro, setGuardandoPreregistro] = useState(false)
  const [eliminandoPreregistro, setEliminandoPreregistro] = useState<string | null>(null)
  const [preImportPreview, setPreImportPreview] = useState<PreregistroImport[] | null>(null)
  const [preImportando, setPreImportando] = useState(false)
  const [preImportResultado, setPreImportResultado] = useState<{ ok: number; errores: number } | null>(null)
  const preFileInputRef = useRef<HTMLInputElement>(null)
  // Import masivo
  const [importPreview, setImportPreview] = useState<UsuarioImport[] | null>(null)
  const [importando, setImportando] = useState(false)
  const [importResultado, setImportResultado] = useState<{ ok: number; errores: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

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

  const cargarPreregistros = useCallback(async () => {
    setCargandoPreregistros(true)
    const lista = await listarPreregistros(ORG_DEMO)
    setPreregistros(lista.sort((a, b) => a.empleadoId.localeCompare(b.empleadoId)))
    setCargandoPreregistros(false)
  }, [])

  useEffect(() => {
    if (autenticado && vista === 'preregistros') cargarPreregistros()
  }, [autenticado, vista, cargarPreregistros])

  async function handleAgregarPreregistro(e: React.FormEvent) {
    e.preventDefault()
    const id = nuevoPreregistro.empleadoId.trim().toUpperCase()
    if (!id) return
    setGuardandoPreregistro(true)
    await crearPreregistro(ORG_DEMO, {
      empleadoId: id,
      orgId: ORG_DEMO,
      rutaAsignada: nuevoPreregistro.rutaAsignada || undefined,
      paradaAsignada: nuevoPreregistro.paradaAsignada || undefined,
      vinculado: false,
      creadoEn: Date.now(),
    })
    setNuevoPreregistro({ empleadoId: '', rutaAsignada: '', paradaAsignada: '' })
    setGuardandoPreregistro(false)
    await cargarPreregistros()
  }

  async function handleEliminarPreregistro(empleadoId: string) {
    if (!confirm(`¿Eliminar preregistro ${empleadoId}?`)) return
    setEliminandoPreregistro(empleadoId)
    await eliminarPreregistro(ORG_DEMO, empleadoId)
    setPreregistros(prev => prev.filter(p => p.empleadoId !== empleadoId))
    setEliminandoPreregistro(null)
  }

  async function handleDescargarPlantillaPreregistros() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Preregistros')
    ws.columns = [
      { header: 'empleadoId', key: 'empleadoId', width: 20 },
      { header: 'ruta',       key: 'ruta',       width: 30 },
      { header: 'parada',     key: 'parada',      width: 30 },
    ]
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    ws.addRow({ empleadoId: 'EMP-001', ruta: 'Ruta Sur — San Isidro', parada: 'Parada Central' })
    ws.addRow({ empleadoId: 'EMP-002', ruta: 'Ruta Sur — San Isidro', parada: 'Parada Norte' })
    ws.addRow({ empleadoId: 'EMP-003', ruta: 'Ruta Este — Las Flores', parada: '' })
    ws.getCell('E1').value = 'Columnas "ruta" y "parada" deben coincidir exactamente con los nombres en el sistema. Pueden dejarse vacías.'
    ws.getCell('E1').font = { italic: true, color: { argb: 'FF6B7280' } }
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla-preregistros-clickgo.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleArchivoPreregistros(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    if (!ws) return
    const headers: string[] = []
    ws.getRow(1).eachCell(cell => headers.push(String(cell.value ?? '').toLowerCase().trim()))
    const iId     = headers.indexOf('empleadoid')
    const iRuta   = headers.indexOf('ruta')
    const iParada = headers.indexOf('parada')
    const filas: PreregistroImport[] = []
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      const empleadoId = String(row.getCell(iId + 1).value ?? '').trim().toUpperCase()
      if (!empleadoId) return
      const rutaNombre   = iRuta   >= 0 ? String(row.getCell(iRuta   + 1).value ?? '').trim() : ''
      const paradaNombre = iParada >= 0 ? String(row.getCell(iParada + 1).value ?? '').trim() : ''
      filas.push({ empleadoId, rutaNombre: rutaNombre || undefined, paradaNombre: paradaNombre || undefined })
    })
    setPreImportPreview(filas)
    setPreImportResultado(null)
  }

  async function handleConfirmarPreImport() {
    if (!preImportPreview) return
    setPreImportando(true)
    const rutaMap = new Map(rutas.map(r => [r.nombre.toLowerCase(), r]))
    let ok = 0, errores = 0
    for (const fila of preImportPreview) {
      if (fila._error) { errores++; continue }
      const ruta = fila.rutaNombre ? rutaMap.get(fila.rutaNombre.toLowerCase()) : undefined
      const parada = ruta && fila.paradaNombre
        ? ruta.paradas?.find(p => p.nombre.toLowerCase() === fila.paradaNombre!.toLowerCase())
        : undefined
      await crearPreregistro(ORG_DEMO, {
        empleadoId: fila.empleadoId,
        orgId: ORG_DEMO,
        rutaAsignada: ruta?.id,
        paradaAsignada: parada?.id,
        vinculado: false,
        creadoEn: Date.now(),
      })
      ok++
    }
    setPreImportResultado({ ok, errores })
    setPreImportPreview(null)
    setPreImportando(false)
    await cargarPreregistros()
  }

  async function handleEliminarUsuario(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    setEliminandoId(userId)
    await remove(ref(db, `usuarios/${userId}`))
    setUsuarios(prev => prev.filter(u => u.id !== userId))
    setEliminandoId(null)
  }

  async function handleActualizarNombre(userId: string, nombre: string) {
    await update(ref(db, `usuarios/${userId}`), { nombre })
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, nombre } : u))
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
      rol: 'chofer',
      rutaAsignada: nuevoUsuario.rutaAsignada || undefined,
      numeroUnidad: nuevoUsuario.numeroUnidad || undefined,
      creadoEn: Date.now(),
    })
    setMostrarModal(false)
    setNuevoUsuario({ nombre: '', telefono: '+52', rol: 'chofer', rutaAsignada: '', paradaAsignada: '', numeroUnidad: '' })
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
            <h1 className="font-bold">Usuarios</h1>
            <p className="text-teal-200 text-xs">
              {vista === 'usuarios' ? `${usuariosFiltrados.length} registrados` : `${preregistros.length} preregistros`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vista === 'usuarios' && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleArchivoSeleccionado} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
                📥 Importar
              </button>
              <button onClick={() => { setMostrarModal(true); setNuevoUsuario(p => ({ ...p, rol: 'chofer' })) }} className="bg-white text-teal-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                + Operador
              </button>
            </>
          )}
        </div>
      </header>

      {/* Toggle vista */}
      <div className="bg-teal-800 px-4 pb-3 flex gap-2">
        <button
          onClick={() => setVista('usuarios')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${vista === 'usuarios' ? 'bg-white text-teal-800' : 'text-teal-200'}`}
        >
          👥 Registrados
        </button>
        <button
          onClick={() => setVista('preregistros')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${vista === 'preregistros' ? 'bg-white text-teal-800' : 'text-teal-200'}`}
        >
          📋 Preregistros
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Vista Preregistros ─────────────────────────────────────────── */}
        {vista === 'preregistros' && (
          <>
            {/* Barra importar preregistros */}
            <input ref={preFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleArchivoPreregistros} className="hidden" />
            <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center justify-between">
              <p className="text-teal-700 text-sm">¿Tienes lista en Excel? Importa masivamente</p>
              <div className="flex gap-2">
                <button onClick={handleDescargarPlantillaPreregistros} className="text-teal-700 font-semibold text-sm underline shrink-0">Plantilla</button>
                <button onClick={() => preFileInputRef.current?.click()} className="bg-teal-700 text-white px-3 py-1 rounded-xl text-sm font-medium">📥 Importar</button>
              </div>
            </div>

            {/* Resultado import preregistros */}
            {preImportResultado && (
              <div className={`rounded-2xl p-4 flex items-center justify-between ${preImportResultado.errores > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="text-sm text-gray-700">{preImportResultado.ok} preregistros importados{preImportResultado.errores > 0 ? ` · ${preImportResultado.errores} omitidos` : ''}</p>
                <button onClick={() => setPreImportResultado(null)} className="text-gray-400">✕</button>
              </div>
            )}

            {/* Formulario agregar preregistro */}
            <form onSubmit={handleAgregarPreregistro} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Agregar trabajador pre-aprobado</h3>
              <input
                placeholder="Número de empleado (ej. EMP-0042)"
                value={nuevoPreregistro.empleadoId}
                onChange={e => setNuevoPreregistro(p => ({ ...p, empleadoId: e.target.value.toUpperCase() }))}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
              />
              <select
                value={nuevoPreregistro.rutaAsignada}
                onChange={e => setNuevoPreregistro(p => ({ ...p, rutaAsignada: e.target.value, paradaAsignada: '' }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">— Ruta (opcional) —</option>
                {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.turno})</option>)}
              </select>
              {nuevoPreregistro.rutaAsignada && (
                <select
                  value={nuevoPreregistro.paradaAsignada}
                  onChange={e => setNuevoPreregistro(p => ({ ...p, paradaAsignada: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">— Parada (opcional) —</option>
                  {getParadasDeRuta(nuevoPreregistro.rutaAsignada).map(p => (
                    <option key={p.id} value={p.id}>{p.orden}. {p.nombre}</option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                disabled={guardandoPreregistro || !nuevoPreregistro.empleadoId.trim()}
                className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {guardandoPreregistro ? 'Guardando...' : '+ Agregar preregistro'}
              </button>
            </form>

            {/* Lista preregistros */}
            {cargandoPreregistros ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)
            ) : preregistros.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-gray-500 text-sm">Sin preregistros. Agrega números de empleado arriba.</p>
              </div>
            ) : preregistros.map(pre => {
              const ruta = rutas.find(r => r.id === pre.rutaAsignada)
              return (
                <div key={pre.empleadoId} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-semibold text-gray-900">{pre.empleadoId}</p>
                    <p className="text-xs text-gray-400">
                      {ruta ? `📍 ${ruta.nombre}` : 'Sin ruta'}
                      {pre.vinculado && <span className="ml-2 text-green-600">✓ Registrado</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEliminarPreregistro(pre.empleadoId)}
                    disabled={eliminandoPreregistro === pre.empleadoId}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
                  >
                    {eliminandoPreregistro === pre.empleadoId ? '...' : '🗑'}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* ── Vista Usuarios ─────────────────────────────────────────────── */}
        {vista === 'usuarios' && <>

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
              {f === 'todos' ? 'Todos' : f === 'trabajador' ? '👷 Trabajadores' : '🚌 Operadores'}
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
                    {usuario.rol === 'chofer' ? (
                      <input
                        defaultValue={usuario.nombre}
                        placeholder="Sin nombre"
                        onBlur={e => {
                          const val = e.target.value.trim()
                          if (val !== usuario.nombre) handleActualizarNombre(usuario.id, val)
                        }}
                        className="font-semibold text-gray-900 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none py-0.5 text-base"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900 font-mono text-sm">{usuario.nombre || 'Sin nombre'}</p>
                    )}
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
        </> }
      </main>

      {/* Modal preview import preregistros */}
      {preImportPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 overflow-hidden">
          <div className="bg-white w-full max-w-md rounded-t-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Vista previa — {preImportPreview.length} empleados</h2>
              </div>
              <button onClick={() => setPreImportPreview(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {preImportPreview.map((fila, i) => (
                <div key={i} className="rounded-xl px-3 py-2 bg-gray-50 flex items-center justify-between">
                  <span className="font-mono font-semibold text-gray-900">{fila.empleadoId}</span>
                  <span className="text-xs text-gray-500 truncate ml-2">{fila.rutaNombre ?? 'Sin ruta'}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setPreImportPreview(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600">Cancelar</button>
              <button
                onClick={handleConfirmarPreImport}
                disabled={preImportando}
                className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {preImportando ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importando...</> : `Confirmar ${preImportPreview.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo operador */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg">🚌 Nuevo operador</h2>
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
            <input
              placeholder="No. de unidad (ej. U-12)"
              value={nuevoUsuario.numeroUnidad}
              onChange={e => setNuevoUsuario(p => ({ ...p, numeroUnidad: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div>
              <label className="text-xs text-gray-500 font-medium">Ruta asignada</label>
              <select
                value={nuevoUsuario.rutaAsignada}
                onChange={e => setNuevoUsuario(p => ({ ...p, rutaAsignada: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">— Sin asignar —</option>
                {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.turno})</option>)}
              </select>
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
