'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { ref, get, update } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRutas, crearRuta, eliminarRuta, actualizarRuta } from '@/features/routes/services/rutas.service'
import type { Ruta, Parada, Turno, EstadoRuta, Usuario } from '@/shared/types'

const MapaParadas = nextDynamic(() => import('@/features/routes/components/MapaParadas').then(m => m.MapaParadas), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-xl animate-pulse" />,
})

const TURNO_LABELS: Record<Turno, string> = {
  matutino: '🌅 Matutino',
  vespertino: '🌆 Vespertino',
  nocturno: '🌙 Nocturno',
  mixto: '🔄 Mixto',
}

const ESTADO_COLORS: Record<EstadoRuta, string> = {
  activa: 'bg-green-100 text-green-700',
  programada: 'bg-blue-100 text-blue-700',
  completada: 'bg-gray-100 text-gray-500',
  cancelada: 'bg-red-100 text-red-500',
}

type Vista = 'lista' | 'nueva' | 'editar'

const RUTA_VACIA = { nombre: '', turno: 'matutino' as Turno, paradas: [] as Parada[], estado: 'programada' as EstadoRuta, unidad: '', placas: '' }

export default function AdminRutasPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const orgId = usuario?.orgId ?? ''
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [choferes, setChoferes] = useState<Usuario[]>([])
  const [choferPorRuta, setChoferPorRuta] = useState<Record<string, string>>({})
  const [choferSeleccionado, setChoferSeleccionado] = useState<string>('')
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [vista, setVista] = useState<Vista>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [rutaActual, setRutaActual] = useState<Partial<Ruta>>(RUTA_VACIA)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

  const cargarRutas = useCallback(async () => {
    setCargandoRutas(true)
    const [data, snapUsuarios] = await Promise.all([
      obtenerRutas(orgId),
      get(ref(db, 'usuarios')),
    ])
    setRutas(data)
    if (snapUsuarios.exists()) {
      const todos = Object.values(snapUsuarios.val() as Record<string, Usuario>).filter(u => u.orgId === orgId)
      const mapa: Record<string, string> = {}
      todos.filter(u => u.rol === 'chofer' && u.rutaAsignada).forEach(u => { mapa[u.rutaAsignada!] = u.nombre })
      setChoferPorRuta(mapa)
      setChoferes(todos.filter(u => u.rol === 'chofer'))
    }
    setCargandoRutas(false)
  }, [orgId])

  useEffect(() => {
    if (orgId) cargarRutas()
  }, [orgId, cargarRutas])

  async function handleGuardar() {
    if (!rutaActual.nombre?.trim()) return
    setGuardando(true)
    try {
      if (rutaActual.id) {
        await actualizarRuta(rutaActual.id, rutaActual)
        // Desasignar chofer anterior si cambió
        const choferAnterior = choferes.find(c => c.rutaAsignada === rutaActual.id && c.id !== choferSeleccionado)
        if (choferAnterior) await update(ref(db, `usuarios/${choferAnterior.id}`), { rutaAsignada: null })
        // Asignar nuevo chofer
        if (choferSeleccionado) await update(ref(db, `usuarios/${choferSeleccionado}`), { rutaAsignada: rutaActual.id })
      } else {
        const nuevaId = await crearRuta(orgId, {
          nombre: rutaActual.nombre!,
          turno: rutaActual.turno ?? 'matutino',
          paradas: rutaActual.paradas ?? [],
          estado: 'programada',
          orgId: orgId,
        })
        if (choferSeleccionado && nuevaId) await update(ref(db, `usuarios/${choferSeleccionado}`), { rutaAsignada: nuevaId })
      }
      await cargarRutas()
      setVista('lista')
      setRutaActual(RUTA_VACIA)
      setChoferSeleccionado('')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(rutaId: string) {
    if (!confirm('¿Eliminar esta ruta? Esta acción no se puede deshacer.')) return
    await eliminarRuta(rutaId)
    await cargarRutas()
  }

  function handleEditar(ruta: Ruta) {
    setRutaActual(ruta)
    const choferActual = choferes.find(c => c.rutaAsignada === ruta.id)
    setChoferSeleccionado(choferActual?.id ?? '')
    setVista('editar')
  }

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setVista('lista'); router.push('/admin/dashboard') }} className="text-teal-200">
            ←
          </button>
          <div>
            <h1 className="font-bold">Gestión de Rutas</h1>
            <p className="text-teal-200 text-xs">{rutas.length} rutas configuradas</p>
          </div>
        </div>
        {vista === 'lista' && (
          <button
            onClick={() => { setRutaActual(RUTA_VACIA); setVista('nueva') }}
            className="bg-white text-teal-700 px-3 py-1.5 rounded-xl text-sm font-medium"
          >
            + Nueva ruta
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Lista de rutas */}
        {vista === 'lista' && (
          <div className="space-y-3">
            {!cargandoRutas && rutas.length > 0 && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="search"
                  placeholder="Buscar por nombre, turno, unidad o placas…"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
            {cargandoRutas ? (
              [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)
            ) : rutas.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-500 font-medium">No hay rutas aún</p>
                <button
                  onClick={() => { setRutaActual(RUTA_VACIA); setVista('nueva') }}
                  className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-xl text-sm"
                >
                  Crear primera ruta
                </button>
              </div>
            ) : (() => {
              const q = busqueda.toLowerCase().trim()
              const filtradas = q
                ? rutas.filter(r =>
                    r.nombre.toLowerCase().includes(q) ||
                    r.turno.includes(q) ||
                    r.unidad?.toLowerCase().includes(q) ||
                    r.placas?.toLowerCase().includes(q)
                  )
                : rutas
              if (filtradas.length === 0) return (
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                  <p className="text-gray-400 text-sm">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
                  <button onClick={() => setBusqueda('')} className="mt-2 text-teal-600 text-sm underline">Limpiar</button>
                </div>
              )
              return filtradas.map((ruta) => (
                <div key={ruta.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{ruta.nombre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[ruta.estado]}`}>
                          {ruta.estado}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {TURNO_LABELS[ruta.turno]} · {ruta.paradas?.length ?? 0} paradas
                      </p>
                      {(ruta.unidad || ruta.placas || choferPorRuta[ruta.id]) && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          {ruta.unidad && <span>🚌 Unidad {ruta.unidad}</span>}
                          {ruta.placas && <span>🪪 {ruta.placas}</span>}
                          {choferPorRuta[ruta.id] && <span>👤 {choferPorRuta[ruta.id]}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditar(ruta)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(ruta.id)}
                        className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {/* Paradas */}
                  {ruta.paradas?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {ruta.paradas.map((p, i) => (
                        <span key={p.id} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                          {i + 1}. {p.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            })()}
          </div>
        )}

        {/* Formulario nueva/editar ruta */}
        {(vista === 'nueva' || vista === 'editar') && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800">
                {vista === 'nueva' ? 'Nueva ruta' : 'Editar ruta'}
              </h2>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={rutaActual.nombre ?? ''}
                  onChange={e => setRutaActual(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Ruta Norte → Ciudad Industrial"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Turno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TURNO_LABELS) as Turno[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setRutaActual(p => ({ ...p, turno: t }))}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        rutaActual.turno === t
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      {TURNO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datos de la unidad */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Datos del vehículo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">N° de unidad</label>
                    <input
                      type="text"
                      value={rutaActual.unidad ?? ''}
                      onChange={e => setRutaActual(p => ({ ...p, unidad: e.target.value }))}
                      placeholder="Ej: U-12"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Placas</label>
                    <input
                      type="text"
                      value={rutaActual.placas ?? ''}
                      onChange={e => setRutaActual(p => ({ ...p, placas: e.target.value.toUpperCase() }))}
                      placeholder="Ej: ABC-123-X"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Operador asignado */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Operador asignado</p>
                <select
                  value={choferSeleccionado}
                  onChange={e => setChoferSeleccionado(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="">— Sin operador —</option>
                  {choferes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.rutaAsignada && c.rutaAsignada !== rutaActual.id ? ' (en otra ruta)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mapa para agregar paradas */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Paradas</h3>
                <p className="text-xs text-gray-400">Haz clic en el mapa para agregar</p>
              </div>
              <MapaParadas
                paradas={rutaActual.paradas ?? []}
                onChange={paradas => setRutaActual(p => ({ ...p, paradas }))}
              />
              {/* Lista de paradas */}
              <div className="mt-3 space-y-1">
                {(rutaActual.paradas ?? []).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-teal-700 text-white rounded-full text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <input
                        value={p.nombre}
                        onChange={e => {
                          const nuevas = [...(rutaActual.paradas ?? [])]
                          nuevas[i] = { ...nuevas[i], nombre: e.target.value }
                          setRutaActual(prev => ({ ...prev, paradas: nuevas }))
                        }}
                        className="text-sm bg-transparent border-b border-gray-200 focus:outline-none focus:border-teal-500 w-40"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const nuevas = (rutaActual.paradas ?? []).filter((_, idx) => idx !== i)
                        setRutaActual(prev => ({ ...prev, paradas: nuevas }))
                      }}
                      className="text-red-400 text-xs hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={() => { setVista('lista'); setRutaActual(RUTA_VACIA) }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando || !rutaActual.nombre?.trim()}
                className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar ruta'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
