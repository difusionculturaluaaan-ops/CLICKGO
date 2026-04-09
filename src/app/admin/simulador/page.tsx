'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRuta, obtenerRutasPorOrg } from '@/shared/lib/firebase/database'
import { useSimuladorRuta } from '@/features/admin/hooks/useSimuladorRuta'
import type { Ruta } from '@/shared/types'

const MapaTiempoReal = nextDynamic(
  () => import('@/features/tracking/components/MapaTiempoReal').then(m => m.MapaTiempoReal),
  { ssr: false, loading: () => <div className="w-full bg-gray-800 animate-pulse" style={{ height: '55vh' }} /> }
)

const ORG_FALLBACK = 'org-demo-001'

export default function SimuladorPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()

  const [rutas, setRutas] = useState<Ruta[]>([])
  const [rutaId, setRutaId] = useState<string>('')
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [temaMapa, setTemaMapa] = useState<'oscuro' | 'claro'>('oscuro')

  const orgId = usuario?.orgId ?? ORG_FALLBACK
  const paradas = ruta?.paradas?.slice().sort((a, b) => a.orden - b.orden) ?? []
  const paradaDestino = paradas[paradas.length - 1]

  const { progreso, iniciar, detener, pausar, reanudar } = useSimuladorRuta(
    rutaId || null,
    paradas,
    ruta?.nombre ?? ''
  )

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

  // Cargar todas las rutas de la org
  useEffect(() => {
    if (!orgId) return
    setCargandoRutas(true)
    obtenerRutasPorOrg(orgId).then((lista) => {
      // Incluir también ruta-demo-001 si existe y no es de la org
      setRutas(lista)
      if (lista.length > 0 && !rutaId) setRutaId(lista[0].id)
      setCargandoRutas(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  // Cargar datos completos de la ruta seleccionada
  useEffect(() => {
    if (!rutaId) return
    obtenerRuta(rutaId).then(setRuta)
  }, [rutaId])

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  const detenido = progreso.estado === 'detenido' || progreso.estado === 'completado'
  const paradaActualIdx = progreso.segmentoActual

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-3 py-2 flex items-center gap-2">
        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 text-sm shrink-0">←</button>
        <div className="flex-1 min-w-0">
          {/* Selector de ruta — solo editable cuando está detenido */}
          {detenido && rutas.length > 1 ? (
            <select
              value={rutaId}
              onChange={(e) => setRutaId(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm font-semibold rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-teal-500"
            >
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          ) : (
            <div>
              <p className="text-white font-semibold text-sm truncate">{ruta?.nombre ?? (cargandoRutas ? 'Cargando rutas...' : 'Sin rutas')}</p>
              <p className="text-gray-500 text-xs leading-none">{ruta?.turno ?? ''} · {paradas.length} paradas</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-2 h-2 rounded-full ${progreso.estado === 'corriendo' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-500 text-xs">{progreso.actualizaciones} GPS</span>
        </div>
      </header>

      {/* Mapa */}
      <div style={{ height: '55vh', position: 'relative' }}>
        {paradaDestino ? (
          <MapaTiempoReal
            ubicacionCamion={progreso.ubicacionActual
              ? { ...progreso.ubicacionActual, speed: 35, heading: 180, accuracy: 8, timestamp: Date.now(), active: true }
              : null}
            paradaLat={paradaDestino.lat}
            paradaLng={paradaDestino.lng}
            paradaNombre={paradaDestino.nombre}
            tema={temaMapa}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <p className="text-gray-500 text-sm">
              {cargandoRutas ? 'Cargando rutas...' : rutas.length === 0 ? 'No hay rutas. Ejecuta el seed primero.' : 'Selecciona una ruta'}
            </p>
          </div>
        )}
        <button
          onClick={() => setTemaMapa(t => t === 'oscuro' ? 'claro' : 'oscuro')}
          className="absolute top-2 right-2 z-1000 bg-white/90 rounded-full w-8 h-8 flex items-center justify-center shadow text-base"
          title="Cambiar tema del mapa"
        >
          {temaMapa === 'oscuro' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Panel inferior */}
      <div className="bg-gray-900 flex-1 overflow-y-auto">

        {/* Estado / progreso */}
        <div className="px-3 py-2 border-b border-gray-800">
          {detenido && (
            <p className="text-gray-400 text-xs text-center">
              {paradas.length} paradas · {ruta?.turno ?? ''} ·{' '}
              {paradas[0]?.nombre ?? '—'} → {paradaDestino?.nombre ?? '—'}
            </p>
          )}
          {progreso.estado === 'cargando' && (
            <p className="text-teal-400 text-xs text-center animate-pulse">Calculando ruta por calles reales...</p>
          )}
          {progreso.estado === 'completado' && (
            <p className="text-teal-400 text-xs text-center font-medium">🏁 Completada · {progreso.actualizaciones} puntos GPS</p>
          )}
          {(progreso.estado === 'corriendo' || progreso.estado === 'pausado') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Desde <span className="text-white">{progreso.paradaActual}</span></span>
                <span className="text-gray-500">Hacia <span className="text-teal-400 font-medium">{progreso.proximaParada}</span></span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progreso.porcentajeSegmento}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                Segmento {progreso.segmentoActual + 1} / {progreso.totalSegmentos}
              </p>
            </div>
          )}
        </div>

        {/* Chips de paradas */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {paradas.map((parada, i) => {
              const completada = progreso.estado !== 'detenido' && i < paradaActualIdx
              const actual = (progreso.estado === 'corriendo' || progreso.estado === 'pausado') && i === paradaActualIdx
              return (
                <div key={parada.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    completada ? 'bg-teal-600 text-white' :
                    actual    ? 'bg-teal-400 text-gray-900 ring-2 ring-teal-300' :
                                'bg-gray-700 text-gray-500'
                  }`}>
                    {completada ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs text-center max-w-16 leading-tight ${
                    actual ? 'text-teal-300' : completada ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {parada.nombre.split(' ').slice(0, 2).join(' ')}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Controles */}
        <div className="px-3 py-3 flex gap-2">
          {detenido ? (
            <button
              onClick={() => iniciar(0)}
              disabled={paradas.length < 2}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm disabled:opacity-40 transition-colors"
            >
              ▶ Iniciar simulación
            </button>
          ) : progreso.estado === 'cargando' ? (
            <div className="flex-1 py-2.5 bg-gray-700 rounded-xl flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-teal-400 text-sm">Calculando ruta...</span>
            </div>
          ) : progreso.estado === 'corriendo' ? (
            <>
              <button onClick={pausar} className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-xl text-sm transition-colors">⏸ Pausar</button>
              <button onClick={detener} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">⏹ Detener</button>
            </>
          ) : (
            <>
              <button onClick={reanudar} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors">▶ Reanudar</button>
              <button onClick={detener} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">⏹ Detener</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
