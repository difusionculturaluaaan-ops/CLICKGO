'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSTransmitter } from '@/features/tracking/hooks/useGPSTransmitter'
import { cerrarSesion } from '@/shared/lib/firebase/auth'

// rutaId hardcodeado para el demo — en producción viene del perfil del chofer
const RUTA_DEMO = 'ruta-demo-001'

const ESTADO_LABEL = {
  inactivo: { texto: 'Sin transmitir', color: 'bg-gray-400' },
  activo:   { texto: 'Transmitiendo', color: 'bg-green-500' },
  error:    { texto: 'Error GPS',     color: 'bg-red-500'   },
  sin_gps:  { texto: 'Sin GPS',       color: 'bg-yellow-500'},
}

export default function OperadorRutaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [rutaActiva, setRutaActiva] = useState(false)
  const { gps, iniciar, detener } = useGPSTransmitter(
    rutaActiva ? RUTA_DEMO : null
  )

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/operador')
  }, [autenticado, cargando, router])

  async function handleIniciar() {
    setRutaActiva(true)
    iniciar()
  }

  async function handleFinalizar() {
    await detener()
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

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">ClickGo — Operador</h1>
          <p className="text-teal-200 text-sm">{usuario?.nombre || usuario?.telefono || 'Chofer'}</p>
        </div>
        <button onClick={handleLogout} className="text-teal-200 text-sm underline">
          Salir
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Estado de transmisión */}
        <div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${estadoInfo.color} ${gps.estado === 'activo' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-gray-700">{estadoInfo.texto}</span>
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
            className="w-full max-w-sm py-5 bg-teal-700 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-teal-800 active:scale-95 transition-all"
          >
            🚌 INICIAR RUTA
          </button>
        ) : (
          <button
            onClick={handleFinalizar}
            className="w-full max-w-sm py-5 bg-red-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
          >
            ⏹ FINALIZAR RUTA
          </button>
        )}

        {/* Info de ruta */}
        <div className="bg-white rounded-2xl shadow p-4 w-full max-w-sm">
          <h2 className="font-semibold text-teal-900 mb-2">Ruta asignada</h2>
          <p className="text-gray-600 text-sm">{usuario?.rutaAsignada ?? 'Demo — Ruta 001'}</p>
          <p className="text-gray-400 text-xs mt-1">Transmisión cada 12 segundos</p>
        </div>
      </main>
    </div>
  )
}
