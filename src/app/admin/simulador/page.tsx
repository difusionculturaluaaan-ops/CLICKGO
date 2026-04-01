'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerRuta } from '@/shared/lib/firebase/database'
import { useSimuladorRuta } from '@/features/admin/hooks/useSimuladorRuta'
import type { Ruta } from '@/shared/types'

const MapaTiempoReal = nextDynamic(
  () => import('@/features/tracking/components/MapaTiempoReal').then(m => m.MapaTiempoReal),
  { ssr: false, loading: () => <div className="w-full bg-gray-200 animate-pulse" style={{ height: '55vh' }} /> }
)

const RUTA_DEMO = 'ruta-demo-001'
const PARADA_REF = { lat: 25.4232, lng: -100.9963, nombre: 'Plaza Fundadores' }

export default function SimuladorPage() {
  const { autenticado, cargando } = useAuth()
  const router = useRouter()
  const [ruta, setRuta] = useState<Ruta | null>(null)

  const paradas = ruta?.paradas?.slice().sort((a, b) => a.orden - b.orden) ?? []
  const { progreso, iniciar, detener, pausar, reanudar } = useSimuladorRuta(RUTA_DEMO, paradas, ruta?.nombre ?? '')

  // ubicacionActual viene directo del hook (waypoints reales de OSRM)
  const ubicacionActual = progreso.ubicacionActual
    ? { ...progreso.ubicacionActual, speed: 35, heading: 180, accuracy: 8, timestamp: Date.now(), active: true }
    : null

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/admin')
  }, [autenticado, cargando, router])

  useEffect(() => {
    obtenerRuta(RUTA_DEMO).then(setRuta)
  }, [])

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const paradaActualIdx = progreso.segmentoActual

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header compacto */}
      <header className="bg-gray-900 border-b border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 text-sm">←</button>
          <div>
            <h1 className="font-bold text-white text-sm">Simulador</h1>
            <p className="text-gray-500 text-xs leading-none">{ruta?.nombre ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${progreso.estado === 'corriendo' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-500 text-xs">{progreso.actualizaciones} GPS</span>
        </div>
      </header>

      {/* Mapa — ocupa la mayor parte */}
      <div style={{ height: '55vh', position: 'relative' }}>
        <MapaTiempoReal
          ubicacionCamion={ubicacionActual}
          paradaLat={PARADA_REF.lat}
          paradaLng={PARADA_REF.lng}
          paradaNombre={PARADA_REF.nombre}
        />
      </div>

      {/* Panel inferior compacto */}
      <div className="bg-gray-900 flex-1 overflow-y-auto">

        {/* Estado + progreso en una sola fila */}
        <div className="px-3 py-2 border-b border-gray-800">
          {(progreso.estado === 'detenido') && (
            <p className="text-gray-400 text-xs text-center">{paradas.length} paradas · {ruta?.turno ?? ''} · Listo para iniciar</p>
          )}
          {progreso.estado === 'cargando' && (
            <p className="text-teal-400 text-xs text-center animate-pulse">Calculando ruta por calles reales...</p>
          )}
          {progreso.estado === 'completado' && (
            <p className="text-teal-400 text-xs text-center font-medium">🏁 Ruta completada · {progreso.actualizaciones} puntos GPS</p>
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

        {/* Paradas compactas */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {paradas.map((parada, i) => {
              const completada = progreso.estado !== 'detenido' && i < paradaActualIdx
              const actual = (progreso.estado === 'corriendo' || progreso.estado === 'pausado') && i === paradaActualIdx
              return (
                <div key={parada.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    completada ? 'bg-teal-600 text-white' :
                    actual ? 'bg-teal-400 text-gray-900 ring-2 ring-teal-300' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {completada ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs text-center max-w-16 leading-tight ${actual ? 'text-teal-300' : completada ? 'text-gray-500' : 'text-gray-400'}`}>
                    {parada.nombre.split(' ')[0]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Botones de control compactos */}
        <div className="px-3 py-3 flex gap-2">
          {progreso.estado === 'detenido' || progreso.estado === 'completado' ? (
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
              <span className="text-teal-400 text-sm">Cargando ruta por calles...</span>
            </div>
          ) : progreso.estado === 'corriendo' ? (
            <>
              <button onClick={pausar} className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-xl text-sm transition-colors">
                ⏸ Pausar
              </button>
              <button onClick={detener} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">
                ⏹ Detener
              </button>
            </>
          ) : (
            <>
              <button onClick={reanudar} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors">
                ▶ Reanudar
              </button>
              <button onClick={detener} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">
                ⏹ Detener
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
