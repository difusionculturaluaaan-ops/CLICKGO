'use client'
import { useState, useRef, useCallback } from 'react'
import { escribirUbicacion, finalizarTransmision, guardarRegistroViaje } from '@/shared/lib/firebase/database'
import { precargarSegmentos } from '@/shared/lib/osrm'
import type { Waypoint } from '@/shared/lib/osrm'
import type { Parada } from '@/shared/types'

export type EstadoSim = 'detenido' | 'cargando' | 'corriendo' | 'pausado' | 'completado'

export interface ProgresoSim {
  estado: EstadoSim
  segmentoActual: number
  paradaActual: string
  proximaParada: string
  porcentajeSegmento: number
  totalSegmentos: number
  actualizaciones: number
  ubicacionActual: { lat: number; lng: number } | null
}

function calcularHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360
}

function retrasoAleatorio(varianzaMin = -3, varianzaMax = 8): number {
  return Math.round(varianzaMin + Math.random() * (varianzaMax - varianzaMin))
}

function horaConOffset(horaBase: string, offsetMinutos: number): string {
  const [h, m] = horaBase.split(':').map(Number)
  const total = h * 60 + m + offsetMinutos
  const hh = Math.floor(total / 60) % 24
  const mm = ((total % 60) + 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const INTERVALO_MS = 800   // ms entre waypoints (más fluido)
const PAUSA_EN_PARADA_MS = 2500
const ORG_DEMO = 'org-demo-001'

export function useSimuladorRuta(rutaId: string | null, paradas: Parada[], nombreRuta = '') {
  const [progreso, setProgreso] = useState<ProgresoSim>({
    estado: 'detenido',
    segmentoActual: 0,
    paradaActual: '',
    proximaParada: '',
    porcentajeSegmento: 0,
    totalSegmentos: Math.max(paradas.length - 1, 0),
    actualizaciones: 0,
    ubicacionActual: null,
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)
  const actualizacionesRef = useRef(0)
  const inicioRef = useRef<number>(0)
  const segmentosRef = useRef<Waypoint[][]>([])

  const limpiar = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    cancelRef.current = true
  }, [])

  const detener = useCallback(async () => {
    limpiar()
    if (rutaId) await finalizarTransmision(rutaId)
    actualizacionesRef.current = 0
    segmentosRef.current = []
    setProgreso(p => ({
      ...p,
      estado: 'detenido',
      segmentoActual: 0,
      porcentajeSegmento: 0,
      actualizaciones: 0,
      ubicacionActual: null,
    }))
  }, [rutaId, limpiar])

  const pausar = useCallback(() => {
    limpiar()
    setProgreso(p => ({ ...p, estado: 'pausado' }))
  }, [limpiar])

  const iniciar = useCallback(async (desdeSegmento = 0) => {
    if (paradas.length < 2) return
    cancelRef.current = false

    // ── Cargar waypoints por calles reales ──────────────────────────────────
    if (desdeSegmento === 0 || segmentosRef.current.length === 0) {
      setProgreso(p => ({ ...p, estado: 'cargando' }))
      const segmentos = await precargarSegmentos(paradas)
      if (cancelRef.current) return
      segmentosRef.current = segmentos
      inicioRef.current = Date.now()
      actualizacionesRef.current = 0
    }

    const segmentos = segmentosRef.current
    const totalSegmentos = paradas.length - 1

    async function ejecutarSegmento(segIdx: number) {
      if (cancelRef.current) return

      const waypoints = segmentos[segIdx] ?? []
      const origen = paradas[segIdx]
      const destino = paradas[segIdx + 1]

      setProgreso(p => ({
        ...p,
        estado: 'corriendo',
        segmentoActual: segIdx,
        paradaActual: origen.nombre,
        proximaParada: destino.nombre,
        porcentajeSegmento: 0,
        totalSegmentos,
      }))

      // Recorrer waypoints del segmento
      for (let wi = 0; wi < waypoints.length; wi++) {
        if (cancelRef.current) return

        const wp = waypoints[wi]
        const siguiente = waypoints[wi + 1]
        const heading = siguiente
          ? calcularHeading(wp.lat, wp.lng, siguiente.lat, siguiente.lng)
          : 180

        // Velocidad simulada: curva senoidal
        const t = wi / Math.max(waypoints.length - 1, 1)
        const curva = Math.sin(t * Math.PI)
        const speed = Math.round(15 + curva * 40)

        actualizacionesRef.current++
        try {
          if (rutaId) await escribirUbicacion(rutaId, {
            lat: wp.lat, lng: wp.lng, speed, heading, accuracy: 8, active: true,
          })
        } catch { /* continuar si Firebase rechaza */ }

        setProgreso(p => ({
          ...p,
          estado: 'corriendo',
          porcentajeSegmento: Math.round((wi / Math.max(waypoints.length - 1, 1)) * 100),
          actualizaciones: actualizacionesRef.current,
          ubicacionActual: { lat: wp.lat, lng: wp.lng },
        }))

        // Esperar al siguiente waypoint
        await new Promise<void>(resolve => {
          timeoutRef.current = setTimeout(resolve, INTERVALO_MS)
        })
        if (cancelRef.current) return
      }

      // Llegó a la parada destino
      if (segIdx + 1 < totalSegmentos) {
        setProgreso(p => ({
          ...p,
          paradaActual: destino.nombre,
          proximaParada: paradas[segIdx + 2]?.nombre ?? '',
          porcentajeSegmento: 100,
        }))
        await new Promise<void>(resolve => {
          timeoutRef.current = setTimeout(resolve, PAUSA_EN_PARADA_MS)
        })
        if (cancelRef.current) return
        await ejecutarSegmento(segIdx + 1)
      } else {
        // Ruta completada — grabar historial
        if (rutaId) await finalizarTransmision(rutaId)

        const hoy = new Date().toISOString().split('T')[0]
        const registroParadas = paradas.map(p => {
          const horaEstimada = p.horaEstimada ?? '06:00'
          const offsetMin = retrasoAleatorio()
          return {
            paradaId: p.id,
            nombre: p.nombre,
            horaEstimada,
            horaReal: horaConOffset(horaEstimada, offsetMin),
            minutosRetraso: offsetMin,
          }
        })

        const aTiempo = registroParadas.filter(p => p.minutosRetraso <= 3).length
        const puntualidad = Math.round((aTiempo / registroParadas.length) * 100)

        try {
          await guardarRegistroViaje({
            rutaId: rutaId ?? 'sin-ruta',
            orgId: ORG_DEMO,
            nombreRuta: nombreRuta || rutaId || 'sin-ruta',
            fecha: hoy,
            inicioReal: inicioRef.current,
            finReal: Date.now(),
            paradas: registroParadas,
            puntualidad,
          })
        } catch { /* continuar si Firebase rechaza */ }

        setProgreso(p => ({ ...p, estado: 'completado', porcentajeSegmento: 100 }))
      }
    }

    await ejecutarSegmento(desdeSegmento)
  }, [rutaId, paradas, nombreRuta])

  const reanudar = useCallback(() => {
    iniciar(progreso.segmentoActual)
  }, [iniciar, progreso.segmentoActual])

  return { progreso, iniciar, detener, pausar, reanudar }
}
