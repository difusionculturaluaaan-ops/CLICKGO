'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSTransmitter } from '@/features/tracking/hooks/useGPSTransmitter'
import { actualizarEstadoRuta, obtenerRuta } from '@/shared/lib/firebase/database'
import { usePresenciaEnParadas } from '@/features/tracking/hooks/usePresenciaEnParadas'
import { cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Ruta } from '@/shared/types'

const ESTADO_LABEL = {
  inactivo: { texto: 'Sin transmitir', color: 'bg-gray-400' },
  activo:   { texto: 'Transmitiendo',  color: 'bg-green-500' },
  error:    { texto: 'Error GPS',      color: 'bg-red-500'   },
  sin_gps:  { texto: 'Sin GPS',        color: 'bg-yellow-500'},
}

interface LogEntry { hora: string; lat: number; lng: number; speed: number }

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function OperadorRutaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [rutaActiva, setRutaActiva] = useState(false)
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [bateria, setBateria] = useState<number | null>(null)

  // Elapsed time
  const inicioRutaRef = useRef<number | null>(null)
  const [tiempoElapsado, setTiempoElapsado] = useState('')

  // Distance counter
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const [distanciaTotal, setDistanciaTotal] = useState(0)

  // Real-time GPS log (últimas 5)
  const [logGPS, setLogGPS] = useState<LogEntry[]>([])

  const rutaId = usuario?.rutaAsignada ?? null
  const presencia = usePresenciaEnParadas(usuario?.orgId ?? null)

  const { gps, iniciar, detener } = useGPSTransmitter(rutaId)

  // Arranca GPS después de que React actualice rutaActiva
  useEffect(() => {
    if (rutaActiva) iniciar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaActiva])

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/operador')
  }, [autenticado, cargando, router])

  useEffect(() => {
    if (!usuario?.rutaAsignada) return
    obtenerRuta(usuario.rutaAsignada).then(setRuta)
  }, [usuario?.rutaAsignada])

  // Batería
  useEffect(() => {
    if (!('getBattery' in navigator)) return
    ;(navigator as unknown as { getBattery: () => Promise<{ level: number; addEventListener: (e: string, cb: () => void) => void }> })
      .getBattery()
      .then((bat) => {
        setBateria(Math.round(bat.level * 100))
        bat.addEventListener('levelchange', () => setBateria(Math.round(bat.level * 100)))
      })
  }, [])

  // Elapsed time timer
  useEffect(() => {
    if (!rutaActiva) { setTiempoElapsado(''); return }
    const interval = setInterval(() => {
      if (!inicioRutaRef.current) return
      const secs = Math.floor((Date.now() - inicioRutaRef.current) / 1000)
      const h = Math.floor(secs / 3600)
      const m = Math.floor((secs % 3600) / 60)
      const s = secs % 60
      setTiempoElapsado(h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [rutaActiva])

  // Distance + log on each GPS update
  useEffect(() => {
    const ub = gps.ultimaUbicacion
    if (!ub || !rutaActiva) return

    // Distance
    if (prevPosRef.current) {
      const d = haversine(prevPosRef.current.lat, prevPosRef.current.lng, ub.lat, ub.lng)
      setDistanciaTotal((prev) => prev + d)
    }
    prevPosRef.current = { lat: ub.lat, lng: ub.lng }

    // Log
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogGPS((prev) => [{ hora, lat: ub.lat, lng: ub.lng, speed: ub.speed }, ...prev].slice(0, 5))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.contadorActualizaciones])

  async function handleIniciar() {
    inicioRutaRef.current = Date.now()
    prevPosRef.current = null
    setDistanciaTotal(0)
    setLogGPS([])
    setRutaActiva(true)
    await actualizarEstadoRuta(rutaId ?? 'ruta-demo-001', 'activa')
  }

  async function handleFinalizar() {
    await detener()
    await actualizarEstadoRuta(rutaId ?? 'ruta-demo-001', 'completada')
    setRutaActiva(false)
  }

  async function handleLogout() {
    await detener()
    await cerrarSesion()
    router.replace('/operador')
  }

  if (cargando || !autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const estadoInfo = ESTADO_LABEL[gps.estado]
  const nombreRuta = ruta?.nombre ?? (usuario?.rutaAsignada ? '...' : 'Demo — Ruta 001')
  const paradas = ruta?.paradas ?? []
  const distanciaLabel = distanciaTotal >= 1000
    ? `${(distanciaTotal / 1000).toFixed(2)} km`
    : `${Math.round(distanciaTotal)} m`

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">ClickGo — Operador</h1>
          <p className="text-teal-200 text-sm">{usuario?.nombre || usuario?.telefono || 'Chofer'}</p>
        </div>
        <div className="flex items-center gap-3">
          {bateria !== null && (
            <div className="flex items-center gap-1 text-teal-200 text-xs">
              <span>{bateria <= 20 ? '🪫' : '🔋'}</span>
              <span>{bateria}%</span>
            </div>
          )}
          <button onClick={handleLogout} className="text-teal-200 text-sm underline">Salir</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 gap-4">
        {/* Estado de transmisión + métricas */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className={`w-3 h-3 rounded-full ${estadoInfo.color} ${gps.estado === 'activo' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-gray-700 text-lg">{estadoInfo.texto}</span>
          </div>

          {gps.estado === 'activo' && gps.ultimaUbicacion && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-700">{gps.ultimaUbicacion.speed}</p>
                <p className="text-gray-400 text-xs">km/h</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-2xl font-bold text-teal-700">{tiempoElapsado || '00:00'}</p>
                <p className="text-gray-400 text-xs">tiempo</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-teal-700">{distanciaLabel}</p>
                <p className="text-gray-400 text-xs">recorrido</p>
              </div>
            </div>
          )}

          {gps.estado === 'activo' && (
            <p className="text-center text-xs text-gray-400">
              {gps.contadorActualizaciones} actualizaciones GPS
            </p>
          )}

          {gps.error && (
            <p className="text-red-500 text-sm mt-2 text-center">{gps.error}</p>
          )}
        </div>

        {/* Botón principal */}
        {!rutaActiva ? (
          <button
            onClick={handleIniciar}
            className="w-full py-5 bg-teal-700 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-teal-800 active:scale-95 transition-all"
          >
            🚌 INICIAR RUTA
          </button>
        ) : (
          <button
            onClick={handleFinalizar}
            className="w-full py-5 bg-red-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
          >
            ⏹ FINALIZAR RUTA
          </button>
        )}

        {/* Log GPS en tiempo real */}
        {logGPS.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold text-teal-900 mb-2 text-sm">Log GPS</h2>
            <div className="space-y-1">
              {logGPS.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">{entry.hora}</span>
                  <span className="text-gray-600">{entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}</span>
                  <span className="text-teal-600 font-medium">{entry.speed} km/h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info de ruta */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-teal-900">Ruta asignada</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              rutaActiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {rutaActiva ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p className="text-gray-700 font-medium">{nombreRuta}</p>
          <p className="text-gray-400 text-xs mt-1">Transmisión cada 12 segundos</p>
        </div>

        {/* Paradas */}
        {paradas.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold text-teal-900 mb-3">
              Paradas ({paradas.length})
            </h2>
            <ol className="space-y-2">
              {paradas
                .slice()
                .sort((a, b) => a.orden - b.orden)
                .map((parada, i) => {
                  const p = presencia[parada.id]
                  return (
                    <li key={parada.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{parada.nombre}</p>
                        {parada.horaEstimada && (
                          <p className="text-xs text-gray-400">{parada.horaEstimada}</p>
                        )}
                      </div>
                      {p && (
                        <div className="shrink-0 text-right">
                          <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {p.count} 📱
                          </span>
                          <p className="text-gray-400 text-xs mt-0.5 max-w-[80px] truncate">
                            {p.nombres.join(', ')}
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
            </ol>
          </div>
        )}

        {/* Alerta batería baja */}
        {bateria !== null && bateria <= 20 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-red-500">🪫</span>
            <p className="text-red-700 text-sm">Batería baja ({bateria}%) — conecta el cargador</p>
          </div>
        )}
      </main>
    </div>
  )
}
