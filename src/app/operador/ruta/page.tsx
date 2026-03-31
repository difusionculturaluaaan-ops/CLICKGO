'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSTransmitter } from '@/features/tracking/hooks/useGPSTransmitter'
import { actualizarEstadoRuta, obtenerRuta } from '@/shared/lib/firebase/database'
import { cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Ruta } from '@/shared/types'

const ESTADO_LABEL = {
  inactivo: { texto: 'Sin transmitir', color: 'bg-gray-400' },
  activo:   { texto: 'Transmitiendo',  color: 'bg-green-500' },
  error:    { texto: 'Error GPS',      color: 'bg-red-500'   },
  sin_gps:  { texto: 'Sin GPS',        color: 'bg-yellow-500'},
}

export default function OperadorRutaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [rutaActiva, setRutaActiva] = useState(false)
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [bateria, setBateria] = useState<number | null>(null)

  // Usar ruta asignada al chofer, o demo como fallback
  const rutaId = usuario?.rutaAsignada ?? 'ruta-demo-001'

  const { gps, iniciar, detener } = useGPSTransmitter(
    rutaActiva ? rutaId : null
  )

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/operador')
  }, [autenticado, cargando, router])

  // Cargar info de la ruta asignada
  useEffect(() => {
    if (!usuario?.rutaAsignada) return
    obtenerRuta(usuario.rutaAsignada).then(setRuta)
  }, [usuario?.rutaAsignada])

  // Nivel de batería (API disponible en Chrome/Android)
  useEffect(() => {
    if (!('getBattery' in navigator)) return
    ;(navigator as unknown as { getBattery: () => Promise<{ level: number; addEventListener: (e: string, cb: () => void) => void }> })
      .getBattery()
      .then((bat) => {
        setBateria(Math.round(bat.level * 100))
        bat.addEventListener('levelchange', () => setBateria(Math.round(bat.level * 100)))
      })
  }, [])

  async function handleIniciar() {
    setRutaActiva(true)
    iniciar()
    await actualizarEstadoRuta(rutaId, 'activa')
  }

  async function handleFinalizar() {
    await detener()
    await actualizarEstadoRuta(rutaId, 'completada')
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
        {/* Estado de transmisión */}
        <div className="bg-white rounded-2xl shadow p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={`w-3 h-3 rounded-full ${estadoInfo.color} ${gps.estado === 'activo' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-gray-700 text-lg">{estadoInfo.texto}</span>
          </div>
          {gps.estado === 'activo' && gps.ultimaUbicacion && (
            <div className="text-sm text-teal-600 mt-2 space-y-1">
              <p>Velocidad: <strong>{gps.ultimaUbicacion.speed} km/h</strong></p>
              <p>Actualizaciones: <strong>{gps.contadorActualizaciones}</strong></p>
              <p className="text-xs text-gray-400">
                {gps.ultimaUbicacion.lat.toFixed(5)}, {gps.ultimaUbicacion.lng.toFixed(5)}
              </p>
            </div>
          )}
          {gps.error && (
            <p className="text-red-500 text-sm mt-2">{gps.error}</p>
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
                .map((parada, i) => (
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
                  </li>
                ))}
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
