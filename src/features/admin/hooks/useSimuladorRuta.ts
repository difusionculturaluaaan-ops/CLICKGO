'use client'
import { useState, useRef, useCallback } from 'react'
import { escribirUbicacion, finalizarTransmision } from '@/shared/lib/firebase/database'
import type { Parada } from '@/shared/types'

export type EstadoSim = 'detenido' | 'corriendo' | 'pausado' | 'completado'

export interface ProgresoSim {
  estado: EstadoSim
  segmentoActual: number      // índice del tramo actual (0 = parada 0 → parada 1)
  paradaActual: string        // nombre de la parada de origen del segmento
  proximaParada: string       // nombre de la parada destino
  porcentajeSegmento: number  // 0-100 dentro del segmento actual
  totalSegmentos: number
  actualizaciones: number
}

// Interpola lat/lng entre dos puntos (t = 0..1)
function interpolar(lat1: number, lng1: number, lat2: number, lng2: number, t: number) {
  return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t }
}

// Calcula heading aproximado entre dos puntos
function calcularHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  const grados = (Math.atan2(dLng, dLat) * 180) / Math.PI
  return (grados + 360) % 360
}

const PASOS_POR_SEGMENTO = 20   // pasos de interpolación entre paradas
const INTERVALO_MS = 1500       // ms entre cada paso (demo rápido)
const PAUSA_EN_PARADA_MS = 3000 // pausa cuando llega a una parada

export function useSimuladorRuta(rutaId: string, paradas: Parada[]) {
  const [progreso, setProgreso] = useState<ProgresoSim>({
    estado: 'detenido',
    segmentoActual: 0,
    paradaActual: '',
    proximaParada: '',
    porcentajeSegmento: 0,
    totalSegmentos: Math.max(paradas.length - 1, 0),
    actualizaciones: 0,
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)
  const actualizacionesRef = useRef(0)

  const limpiar = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    cancelRef.current = true
  }, [])

  const detener = useCallback(async () => {
    limpiar()
    await finalizarTransmision(rutaId)
    actualizacionesRef.current = 0
    setProgreso(p => ({ ...p, estado: 'detenido', segmentoActual: 0, porcentajeSegmento: 0, actualizaciones: 0 }))
  }, [rutaId, limpiar])

  const pausar = useCallback(() => {
    limpiar()
    setProgreso(p => ({ ...p, estado: 'pausado' }))
  }, [limpiar])

  const iniciar = useCallback((desdeSegmento = 0) => {
    if (paradas.length < 2) return
    cancelRef.current = false

    const segmentos = paradas.length - 1

    async function ejecutarPaso(segIdx: number, paso: number) {
      if (cancelRef.current) return

      const origen = paradas[segIdx]
      const destino = paradas[segIdx + 1]
      const t = paso / PASOS_POR_SEGMENTO
      const { lat, lng } = interpolar(origen.lat, origen.lng, destino.lat, destino.lng, t)
      const heading = calcularHeading(origen.lat, origen.lng, destino.lat, destino.lng)

      // Velocidad: más lento al salir/llegar a parada, más rápido en medio
      const curva = Math.sin(t * Math.PI)          // 0→1→0
      const speed = Math.round(15 + curva * 40)    // 15–55 km/h

      actualizacionesRef.current++
      await escribirUbicacion(rutaId, { lat, lng, speed, heading, accuracy: 8, active: true })

      setProgreso({
        estado: 'corriendo',
        segmentoActual: segIdx,
        paradaActual: origen.nombre,
        proximaParada: destino.nombre,
        porcentajeSegmento: Math.round(t * 100),
        totalSegmentos: segmentos,
        actualizaciones: actualizacionesRef.current,
      })

      if (cancelRef.current) return

      if (paso < PASOS_POR_SEGMENTO) {
        // Siguiente paso en el mismo segmento
        timeoutRef.current = setTimeout(() => ejecutarPaso(segIdx, paso + 1), INTERVALO_MS)
      } else if (segIdx + 1 < segmentos) {
        // Llegó a una parada intermedia — pausa y avanza al siguiente segmento
        setProgreso(p => ({ ...p, paradaActual: destino.nombre, proximaParada: paradas[segIdx + 2]?.nombre ?? '', porcentajeSegmento: 0 }))
        timeoutRef.current = setTimeout(() => ejecutarPaso(segIdx + 1, 0), PAUSA_EN_PARADA_MS)
      } else {
        // Llegó al destino final
        await finalizarTransmision(rutaId)
        setProgreso(p => ({ ...p, estado: 'completado', porcentajeSegmento: 100 }))
      }
    }

    setProgreso(p => ({
      ...p,
      estado: 'corriendo',
      segmentoActual: desdeSegmento,
      paradaActual: paradas[desdeSegmento]?.nombre ?? '',
      proximaParada: paradas[desdeSegmento + 1]?.nombre ?? '',
      porcentajeSegmento: 0,
      totalSegmentos: segmentos,
    }))

    ejecutarPaso(desdeSegmento, 0)
  }, [rutaId, paradas])

  const reanudar = useCallback(() => {
    iniciar(progreso.segmentoActual)
  }, [iniciar, progreso.segmentoActual])

  return { progreso, iniciar, detener, pausar, reanudar }
}
