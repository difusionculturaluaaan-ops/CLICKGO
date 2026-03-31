'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSReceiver } from '@/features/tracking/hooks/useGPSReceiver'
import { cerrarSesion } from '@/shared/lib/firebase/auth'

// Leaflet requiere client-side — dynamic import sin SSR
const MapaTiempoReal = dynamic(
  () => import('@/features/tracking/components/MapaTiempoReal').then((m) => m.MapaTiempoReal),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-800 rounded-xl animate-pulse" /> }
)

// Demo: parada fija en Saltillo (Plaza Fundadores)
const RUTA_DEMO = 'ruta-demo-001'
const PARADA_DEMO = { lat: 25.4232, lng: -100.9963, nombre: 'Plaza Fundadores' }

const ESTADO_CONFIG = {
  sin_senal: {
    label: 'Sin señal del camión',
    color: 'bg-gray-500',
    texto: 'El camión aún no ha iniciado la ruta',
    icono: '📡',
  },
  en_camino: {
    label: 'En camino',
    color: 'bg-blue-500',
    texto: 'El camión está en ruta hacia tu parada',
    icono: '🚌',
  },
  ya_viene: {
    label: '¡Ya viene!',
    color: 'bg-yellow-500',
    texto: 'El camión está a menos de 5 minutos',
    icono: '⚡',
  },
  llegando: {
    label: '¡Llegando!',
    color: 'bg-green-500',
    texto: 'El camión está llegando — sal ahora',
    icono: '🟢',
  },
}

export default function TrabajadorMapaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const { ubicacion, eta, conectado } = useGPSReceiver(
    RUTA_DEMO,
    PARADA_DEMO.lat,
    PARADA_DEMO.lng
  )
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>('')

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/trabajador')
  }, [autenticado, cargando, router])

  useEffect(() => {
    if (ubicacion?.timestamp) {
      const fecha = new Date(ubicacion.timestamp)
      setUltimaActualizacion(fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
  }, [ubicacion])

  async function handleLogout() {
    await cerrarSesion()
    router.replace('/trabajador')
  }

  if (cargando || !autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const estadoActual = eta?.estado ?? 'sin_senal'
  const config = ESTADO_CONFIG[estadoActual]

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white">ClickGo</h1>
          <p className="text-gray-400 text-xs">{usuario?.nombre || usuario?.telefono || 'Trabajador'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <button onClick={handleLogout} className="text-gray-400 text-xs underline">Salir</button>
        </div>
      </header>

      {/* Mapa — ocupa la mayor parte */}
      <div className="flex-1 relative" style={{ minHeight: '55vh' }}>
        <MapaTiempoReal
          ubicacionCamion={ubicacion}
          paradaLat={PARADA_DEMO.lat}
          paradaLng={PARADA_DEMO.lng}
          paradaNombre={PARADA_DEMO.nombre}
        />
        {!ubicacion && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
            <p className="text-gray-300 text-sm">Esperando señal del camión...</p>
          </div>
        )}
      </div>

      {/* Panel inferior — ETA y estado */}
      <div className="bg-gray-900 px-4 py-4 space-y-3">
        {/* Estado principal */}
        <div className={`${config.color} rounded-2xl p-4 flex items-center gap-3`}>
          <span className="text-3xl">{config.icono}</span>
          <div>
            <p className="text-white font-bold text-lg">{config.label}</p>
            <p className="text-white/80 text-sm">{config.texto}</p>
          </div>
        </div>

        {/* ETA y detalles */}
        {eta && eta.estado !== 'sin_senal' && (
          <div className="bg-gray-800 rounded-2xl p-4 flex justify-between items-center">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{eta.minutos}</p>
              <p className="text-gray-400 text-xs">minutos</p>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {eta.distanciaMetros >= 1000
                  ? `${(eta.distanciaMetros / 1000).toFixed(1)} km`
                  : `${eta.distanciaMetros} m`}
              </p>
              <p className="text-gray-400 text-xs">distancia</p>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{ubicacion?.speed ?? 0}</p>
              <p className="text-gray-400 text-xs">km/h</p>
            </div>
          </div>
        )}

        {/* Parada asignada */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-teal-400">📍</span>
            <div>
              <p className="text-white text-sm font-medium">{PARADA_DEMO.nombre}</p>
              <p className="text-gray-500 text-xs">Tu parada asignada</p>
            </div>
          </div>
          {ultimaActualizacion && (
            <p className="text-gray-500 text-xs">{ultimaActualizacion}</p>
          )}
        </div>
      </div>
    </div>
  )
}
