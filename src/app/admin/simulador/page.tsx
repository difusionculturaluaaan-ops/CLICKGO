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
  { ssr: false, loading: () => <div className="w-full bg-gray-200 animate-pulse" style={{ height: '45vh' }} /> }
)

const RUTA_DEMO = 'ruta-demo-001'
// Parada de referencia para el trabajador: Plaza Fundadores (p3)
const PARADA_REF = { lat: 25.4232, lng: -100.9963, nombre: 'Plaza Fundadores' }

export default function SimuladorPage() {
  const { autenticado, cargando } = useAuth()
  const router = useRouter()
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [ubicacionActual, setUbicacionActual] = useState<{ lat: number; lng: number; speed: number; heading: number; accuracy: number; timestamp: number; active: boolean } | null>(null)

  const paradas = ruta?.paradas?.slice().sort((a, b) => a.orden - b.orden) ?? []
  const { progreso, iniciar, detener, pausar, reanudar } = useSimuladorRuta(RUTA_DEMO, paradas, ruta?.nombre ?? '')

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/admin')
  }, [autenticado, cargando, router])

  useEffect(() => {
    obtenerRuta(RUTA_DEMO).then(setRuta)
  }, [])

  // Sintetizar ubicación para el mapa a partir del progreso
  useEffect(() => {
    if (progreso.estado === 'corriendo' && paradas.length > 1) {
      const origen = paradas[progreso.segmentoActual]
      const destino = paradas[progreso.segmentoActual + 1]
      if (!origen || !destino) return
      const t = progreso.porcentajeSegmento / 100
      const lat = origen.lat + (destino.lat - origen.lat) * t
      const lng = origen.lng + (destino.lng - origen.lng) * t
      setUbicacionActual({ lat, lng, speed: 35, heading: 180, accuracy: 8, timestamp: Date.now(), active: true })
    } else if (progreso.estado === 'detenido' || progreso.estado === 'completado') {
      setUbicacionActual(null)
    }
  }, [progreso, paradas])

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const totalParadas = paradas.length
  const paradaActualIdx = progreso.segmentoActual

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400">←</button>
          <div>
            <h1 className="font-bold text-white">Simulador de Ruta</h1>
            <p className="text-gray-400 text-xs">{ruta?.nombre ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${progreso.estado === 'corriendo' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-400 text-xs">{progreso.actualizaciones} envíos</span>
        </div>
      </header>

      {/* Mapa */}
      <div style={{ height: '45vh', overflow: 'hidden' }}>
        <MapaTiempoReal
          ubicacionCamion={ubicacionActual}
          paradaLat={PARADA_REF.lat}
          paradaLng={PARADA_REF.lng}
          paradaNombre={PARADA_REF.nombre}
        />
      </div>

      {/* Controles */}
      <div className="bg-gray-900 px-4 py-4 flex-1 space-y-4">
        {/* Estado actual */}
        <div className="bg-gray-800 rounded-2xl p-4">
          {progreso.estado === 'detenido' && (
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm">Listo para iniciar simulación</p>
              <p className="text-gray-500 text-xs mt-1">{totalParadas} paradas · {ruta?.turno ?? ''}</p>
            </div>
          )}
          {(progreso.estado === 'corriendo' || progreso.estado === 'pausado') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Desde</span>
                <span className="text-white font-medium">{progreso.paradaActual}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Hacia</span>
                <span className="text-teal-400 font-medium">{progreso.proximaParada}</span>
              </div>
              {/* Barra de progreso del segmento */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progreso.porcentajeSegmento}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Segmento {progreso.segmentoActual + 1} de {progreso.totalSegmentos}
              </p>
            </div>
          )}
          {progreso.estado === 'completado' && (
            <div className="text-center py-2">
              <p className="text-2xl mb-1">🏁</p>
              <p className="text-white font-semibold">Ruta completada</p>
              <p className="text-gray-400 text-xs mt-1">{progreso.actualizaciones} puntos GPS enviados</p>
            </div>
          )}
        </div>

        {/* Paradas — línea de tiempo */}
        {paradas.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs font-medium mb-3">PARADAS</p>
            <div className="space-y-2">
              {paradas.map((parada, i) => {
                const completada = progreso.estado !== 'detenido' && i < paradaActualIdx
                const actual = progreso.estado === 'corriendo' && i === paradaActualIdx
                const pendiente = i > paradaActualIdx || progreso.estado === 'detenido'
                return (
                  <div key={parada.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      completada ? 'bg-teal-600 text-white' :
                      actual ? 'bg-teal-400 text-gray-900 ring-2 ring-teal-300' :
                      'bg-gray-700 text-gray-500'
                    }`}>
                      {completada ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${actual ? 'text-teal-300 font-medium' : completada ? 'text-gray-400' : 'text-gray-300'}`}>
                        {parada.nombre}
                      </p>
                      {parada.horaEstimada && (
                        <p className="text-xs text-gray-600">{parada.horaEstimada}</p>
                      )}
                    </div>
                    {actual && <span className="text-teal-400 text-xs shrink-0 animate-pulse">● en ruta</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Botones de control */}
        <div className="grid grid-cols-2 gap-3">
          {progreso.estado === 'detenido' || progreso.estado === 'completado' ? (
            <button
              onClick={() => iniciar(0)}
              disabled={paradas.length < 2}
              className="col-span-2 py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-lg disabled:opacity-40 transition-colors"
            >
              ▶ Iniciar simulación
            </button>
          ) : progreso.estado === 'corriendo' ? (
            <>
              <button
                onClick={pausar}
                className="py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-2xl transition-colors"
              >
                ⏸ Pausar
              </button>
              <button
                onClick={detener}
                className="py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors"
              >
                ⏹ Detener
              </button>
            </>
          ) : (
            <>
              <button
                onClick={reanudar}
                className="py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl transition-colors"
              >
                ▶ Reanudar
              </button>
              <button
                onClick={detener}
                className="py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors"
              >
                ⏹ Detener
              </button>
            </>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs">
          Abre <span className="text-teal-400">/trabajador/mapa</span> en otra pestaña para ver la perspectiva del trabajador en tiempo real
        </p>
      </div>
    </div>
  )
}
