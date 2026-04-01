'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSReceiver } from '@/features/tracking/hooks/useGPSReceiver'
import { useFCMToken } from '@/shared/hooks/useFCMToken'
import { obtenerRuta } from '@/shared/lib/firebase/database'
import { cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Parada, Ruta } from '@/shared/types'

const MapaTiempoReal = nextDynamic(
  () => import('@/features/tracking/components/MapaTiempoReal').then((m) => m.MapaTiempoReal),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-800 rounded-xl animate-pulse" /> }
)

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
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [parada, setParada] = useState<Parada | null>(null)
  const [cargandoRuta, setCargandoRuta] = useState(true)

  // Resolver ruta y parada desde el perfil del usuario
  useEffect(() => {
    if (!usuario) {
      setCargandoRuta(false)
      return
    }
    if (!usuario.rutaAsignada) {
      setCargandoRuta(false)
      return
    }
    obtenerRuta(usuario.rutaAsignada).then((r) => {
      setRuta(r)
      if (r && usuario.paradaAsignada) {
        const p = r.paradas?.find((p) => p.id === usuario.paradaAsignada) ?? null
        setParada(p)
      }
      setCargandoRuta(false)
    })
  }, [usuario])

  const { ubicacion, eta, conectado } = useGPSReceiver(
    ruta?.id ?? null,
    parada?.lat ?? 0,
    parada?.lng ?? 0
  )

  const { permiso, solicitarPermiso } = useFCMToken(usuario?.id ?? null)
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

  if (cargando || cargandoRuta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Sin ruta asignada
  if (!usuario?.rutaAsignada || !ruta) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">🚌</span>
        <h2 className="text-white font-bold text-xl mb-2">Sin ruta asignada</h2>
        <p className="text-gray-400 text-sm mb-6">
          Aún no tienes una ruta asignada. Contacta a tu supervisor para que te asigne tu camión y parada.
        </p>
        <button onClick={handleLogout} className="text-teal-400 text-sm underline">
          Cerrar sesión
        </button>
      </div>
    )
  }

  const estadoActual = eta?.estado ?? 'sin_senal'
  const config = ESTADO_CONFIG[estadoActual]
  const nombreParada = parada?.nombre ?? 'Parada asignada'
  const paradaLat = parada?.lat ?? 0
  const paradaLng = parada?.lng ?? 0

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col max-w-md mx-auto w-full shadow-2xl">
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

      {/* Banner notificaciones */}
      {permiso === 'default' && (
        <div className="bg-teal-700 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-white text-sm">Activa notificaciones para saber cuándo llega tu camión</p>
          <button
            onClick={solicitarPermiso}
            className="shrink-0 bg-white text-teal-700 font-bold text-xs px-3 py-1.5 rounded-full"
          >
            Activar
          </button>
        </div>
      )}

      {/* Ruta activa */}
      <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
        <span className="text-xs text-gray-400">Ruta:</span>
        <span className="text-xs text-teal-400 font-medium">{ruta.nombre}</span>
        <span className="text-xs text-gray-600">· {ruta.turno}</span>
      </div>

      {/* Mapa */}
      <div style={{ height: '55vh', position: 'relative' }}>
        <MapaTiempoReal
          ubicacionCamion={ubicacion}
          paradaLat={paradaLat}
          paradaLng={paradaLng}
          paradaNombre={nombreParada}
        />
        {!ubicacion && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-gray-300 text-sm">Esperando señal del camión...</p>
          </div>
        )}
      </div>

      {/* Panel inferior */}
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
              <p className="text-white text-sm font-medium">{nombreParada}</p>
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
