'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGPSReceiver } from '@/features/tracking/hooks/useGPSReceiver'
import { usePresenciaWorker } from '@/features/tracking/hooks/usePresenciaWorker'
import { useFCMToken } from '@/shared/hooks/useFCMToken'
import { obtenerRuta } from '@/shared/lib/firebase/database'
import { obtenerRutas } from '@/features/routes/services/rutas.service'
import { cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Parada, Ruta } from '@/shared/types'

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function paradaMasCercana(ruta: Ruta, lat: number, lng: number): Parada | null {
  if (!ruta.paradas?.length) return null
  return ruta.paradas.reduce((mejor, p) => {
    const d = distanciaKm(lat, lng, p.lat, p.lng)
    const dMejor = distanciaKm(lat, lng, mejor.lat, mejor.lng)
    return d < dMejor ? p : mejor
  })
}

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

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
function toCompass(deg: number) {
  return COMPASS[Math.round(deg / 45) % 8]
}

export default function TrabajadorMapaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [parada, setParada] = useState<Parada | null>(null)
  const [rutaFetched, setRutaFetched] = useState(false)
  const cargandoRuta = !!usuario?.rutaAsignada && !rutaFetched

  // Rutas cercanas
  const [rutasCercanas, setRutasCercanas] = useState<Ruta[]>([])
  const [rutaVistaId, setRutaVistaId] = useState<string | null>(null)
  const rutaVista = rutasCercanas.find(r => r.id === rutaVistaId) ?? ruta

  // Worker's own GPS position
  const [workerLat, setWorkerLat] = useState<number | null>(null)
  const [workerLng, setWorkerLng] = useState<number | null>(null)
  const [temaMapa, setTemaMapa] = useState<'oscuro' | 'claro'>('oscuro')

  // Signal freshness: 'live' | 'reciente' | 'viejo'
  const [frescura, setFrescura] = useState<'live' | 'reciente' | 'viejo'>('viejo')

  // Resolver ruta asignada y todas las rutas cercanas
  useEffect(() => {
    if (!usuario?.orgId) return
    let cancelled = false

    Promise.all([
      usuario.rutaAsignada ? obtenerRuta(usuario.rutaAsignada) : Promise.resolve(null),
      obtenerRutas(usuario.orgId),
    ]).then(([rutaAsignada, todasRutas]) => {
      if (cancelled) return
      setRuta(rutaAsignada)
      if (rutaAsignada && usuario.paradaAsignada) {
        const p = rutaAsignada.paradas?.find(p => p.id === usuario.paradaAsignada) ?? null
        setParada(p)
      }
      setRutaFetched(true)
      // Guardar todas las rutas (la asignada primero)
      const ordenadas = [
        ...(rutaAsignada ? [rutaAsignada] : []),
        ...todasRutas.filter(r => r.id !== rutaAsignada?.id),
      ]
      setRutasCercanas(ordenadas)
      setRutaVistaId(rutaAsignada?.id ?? todasRutas[0]?.id ?? null)
    })
    return () => { cancelled = true }
  }, [usuario])

  // Filtrar rutas a 2 km cuando el GPS se establece por primera vez
  const filtroAplicadoRef = useRef(false)
  useEffect(() => {
    if (workerLat === null || workerLng === null || filtroAplicadoRef.current) return
    filtroAplicadoRef.current = true
    const RADIO_KM = 2
    const cercanas = rutasCercanas.filter(r =>
      r.paradas?.some(p => distanciaKm(workerLat, workerLng, p.lat, p.lng) <= RADIO_KM)
    )
    const asignada = ruta ? [ruta] : []
    const ids = new Set(cercanas.map(r => r.id))
    const final = [...cercanas, ...asignada.filter(r => !ids.has(r.id))]
    if (final.length > 0) setRutasCercanas(final)
  }, [workerLat, workerLng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar ruta vista, recalcular parada más cercana (si no es la asignada)
  useEffect(() => {
    if (!rutaVista) return
    if (rutaVista.id === ruta?.id) {
      // Restaurar parada asignada
      const p = ruta.paradas?.find(p => p.id === usuario?.paradaAsignada) ?? null
      setParada(p)
    } else if (workerLat !== null && workerLng !== null) {
      setParada(paradaMasCercana(rutaVista, workerLat, workerLng))
    } else {
      setParada(rutaVista.paradas?.[0] ?? null)
    }
  }, [rutaVistaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { ubicacion, eta, conectado } = useGPSReceiver(
    rutaVista?.id ?? null,
    parada?.lat ?? 0,
    parada?.lng ?? 0,
    parada?.id ?? null,
    usuario?.orgId ?? null,
  )

  // Presencia automática — se registra al abrir la app, se borra al cerrarla
  usePresenciaWorker(
    usuario?.orgId ?? null,
    usuario?.id ?? null,
    usuario?.nombre || 'Trabajador',
    usuario?.paradaAsignada ?? null,
  )

  const { permiso, solicitarPermiso } = useFCMToken(usuario?.id ?? null)

  // Worker's own GPS via geolocation API
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setWorkerLat(pos.coords.latitude)
        setWorkerLng(pos.coords.longitude)
      },
      () => {
        // GPS denegado o no disponible — se oculta el punto azul
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Signal freshness indicator (updates every second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!ubicacion?.timestamp) { setFrescura('viejo'); return }
      const age = (Date.now() - ubicacion.timestamp) / 1000
      setFrescura(age < 30 ? 'live' : age < 60 ? 'reciente' : 'viejo')
    }, 1000)
    return () => clearInterval(interval)
  }, [ubicacion?.timestamp])

  // Vibration on ya_viene / llegando state change
  const prevEstadoRef = useRef<string>('')
  useEffect(() => {
    const estado = eta?.estado ?? 'sin_senal'
    if (prevEstadoRef.current !== estado && (estado === 'ya_viene' || estado === 'llegando')) {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
    }
    prevEstadoRef.current = estado
  }, [eta?.estado])

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/trabajador')
  }, [autenticado, cargando, router])

  const ultimaActualizacion = useMemo(() => {
    if (!ubicacion?.timestamp) return ''
    return new Date(ubicacion.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
  const nombreParada = parada?.nombre ?? 'Parada más cercana'
  const paradaLat = parada?.lat ?? 0
  const paradaLng = parada?.lng ?? 0
  const esRutaAlterna = rutaVista?.id !== ruta?.id

  const frescuraIcon = frescura === 'live' ? '🟢' : frescura === 'reciente' ? '🟡' : '🔴'
  const frescuraLabel = frescura === 'live' ? 'En vivo' : frescura === 'reciente' ? 'Reciente' : 'Sin señal'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col max-w-md mx-auto w-full shadow-2xl">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white">ClickGo</h1>
          <p className="text-gray-400 text-xs">{usuario?.empleadoId ?? 'Trabajador'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">{frescuraIcon}</span>
          <span className={`text-xs ${frescura === 'live' ? 'text-green-400' : frescura === 'reciente' ? 'text-yellow-400' : 'text-gray-500'}`}>
            {frescuraLabel}
          </span>
          <div className={`w-2 h-2 rounded-full ml-1 ${conectado ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <button
            onClick={() => setTemaMapa(t => t === 'oscuro' ? 'claro' : 'oscuro')}
            className="text-gray-400 text-lg ml-1"
            title="Cambiar tema del mapa"
          >
            {temaMapa === 'oscuro' ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="text-gray-400 text-xs underline ml-1">Salir</button>
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

      {/* Selector de rutas */}
      {rutasCercanas.length > 1 && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
          <p className="text-xs text-gray-500 mb-1.5">Selecciona el camión a seguir:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {rutasCercanas.map(r => (
              <button
                key={r.id}
                onClick={() => setRutaVistaId(r.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  rutaVistaId === r.id
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300'
                }`}
              >
                {r.id === ruta?.id ? '⭐ ' : ''}{r.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ruta activa + datos de unidad */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Ruta:</span>
          <span className="text-xs text-teal-400 font-medium">{rutaVista?.nombre}</span>
          <span className="text-xs text-gray-600">· {rutaVista?.turno}</span>
        </div>
        {(rutaVista?.unidad || rutaVista?.placas) && (
          <div className="flex items-center gap-3 mt-0.5">
            {rutaVista?.unidad && (
              <span className="text-xs text-yellow-400 font-medium">🚌 Unidad {rutaVista.unidad}</span>
            )}
            {rutaVista?.placas && (
              <span className="text-xs text-gray-500">{rutaVista.placas}</span>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div style={{ height: '55vh', position: 'relative' }}>
        <MapaTiempoReal
          ubicacionCamion={ubicacion}
          paradaLat={paradaLat}
          paradaLng={paradaLng}
          paradaNombre={nombreParada}
          userLat={workerLat ?? undefined}
          userLng={workerLng ?? undefined}
          tema={temaMapa}
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
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg">{config.label}</p>
            <p className="text-white/80 text-sm">{config.texto}</p>
            {rutaVista?.unidad && estadoActual !== 'sin_senal' && (
              <p className="text-white/60 text-xs mt-0.5">
                Busca la unidad <span className="font-bold text-white">{rutaVista.unidad}</span>
                {rutaVista.placas && <span> · {rutaVista.placas}</span>}
              </p>
            )}
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
              {ubicacion?.heading != null && (
                <p className="text-gray-500 text-xs">{toCompass(ubicacion.heading)}</p>
              )}
            </div>
          </div>
        )}

        {/* Parada asignada */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-teal-400">📍</span>
            <div>
              <p className="text-white text-sm font-medium">{nombreParada}</p>
              <p className="text-gray-500 text-xs">{esRutaAlterna ? 'Parada más cercana' : 'Tu parada asignada'}</p>
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
