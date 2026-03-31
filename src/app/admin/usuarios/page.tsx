'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ref, get, update, push, set } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRutas } from '@/features/routes/services/rutas.service'
import type { Usuario, Ruta, Parada } from '@/shared/types'

const ORG_DEMO = 'org-demo-001'

export default function AdminUsuariosPage() {
  const { autenticado, cargando } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'trabajador' | 'chofer'>('todos')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  // Modal nuevo usuario
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', telefono: '+52', rol: 'trabajador' as 'trabajador' | 'chofer', rutaAsignada: '', paradaAsignada: '' })

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
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-white text-teal-700 px-3 py-1.5 rounded-xl text-sm font-medium"
        >
          + Agregar
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
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
                  <div>
                    <p className="font-semibold text-gray-900">{usuario.nombre || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-400">{usuario.telefono}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    usuario.rol === 'chofer' ? 'bg-blue-100 text-blue-700' :
                    usuario.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {usuario.rol}
                  </span>
                </div>

                {usuario.rol !== 'admin' && (
                  <div className="space-y-2">
                    {/* Asignar ruta */}
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

                    {/* Asignar parada (solo trabajadores) */}
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

                    {/* Resumen asignación */}
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
    </div>
  )
}
