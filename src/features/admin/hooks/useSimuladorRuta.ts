'use client'
import { useState, useRef, useCallback } from 'react'
import { escribirUbicacion, finalizarTransmision, guardarRegistroViaje } from '@/shared/lib/firebase/database'
import type { Parada } from '@/shared/types'

export type EstadoSim = 'detenido' | 'corriendo' | 'pausado' | 'completado'

export interface ProgresoSim {
  estado: EstadoSim
  segmentoActual: number
  paradaActual: string
  proximaParada: string
  porcentajeSegmento: number
  totalSegmentos: number
  actualizaciones: number
}

function interpolar(lat1: number, lng1: number, lat2: number, lng2: number, t: number) {
  return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t }
}

function calcularHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  const grados = (Math.atan2(dLng, dLat) * 180) / Math.PI
  return (grados + 360) % 360
}

// Añade ±N minutos aleatorios para simular variación real
function retrasoAleatorio(minutos: number, varianzaMin = -3, varianzaMax = 8): number {
  return minutos + Math.round(varianzaMin + Math.random() * (varianzaMax - varianzaMin))
}

function horaConOffset(horaBase: string, offsetMinutos: number): string {
  const [h, m] = horaBase.split(':').map(Number)
  const total = h * 60 + m + offsetMinutos
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const PASOS_POR_SEGMENTO = 20
const INTERVALO_MS = 1500
const PAUSA_EN_PARADA_MS = 3000
const ORG_DEMO = 'org-demo-001'

export function useSimuladorRuta(rutaId: string, paradas: Parada[], nombreRuta = '') {
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
  const inicioRef = useRef<number>(0)
  // Tiempos reales de llegada a cada parada
  const tiemposRealesRef = useRef<number[]>([])

  const limpiar = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    cancelRef.current = true
  }, [])

  const detener = useCallback(async () => {
    limpiar()
    await finalizarTransmision(rutaId)
    actualizacionesRef.current = 0
    tiemposRealesRef.current = []
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
    if (desdeSegmento === 0) {
      inicioRef.current = Date.now()
      tiemposRealesRef.current = [Date.now()] // hora real de salida (parada 0)
    }

    async function ejecutarPaso(segIdx: number, paso: number) {
      if (cancelRef.current) return

      const origen = paradas[segIdx]
      const destino = paradas[segIdx + 1]
      const t = paso / PASOS_POR_SEGMENTO
      const { lat, lng } = interpolar(origen.lat, origen.lng, destino.lat, destino.lng, t)
      const heading = calcularHeading(origen.lat, origen.lng, destino.lat, destino.lng)
      const curva = Math.sin(t * Math.PI)
      const speed = Math.round(15 + curva * 40)

      actualizacionesRef.current++
      try {
        await escribirUbicacion(rutaId, { lat, lng, speed, heading, accuracy: 8, active: true })
      } catch {
        // Continuar simulación aunque falle la escritura (ej. reglas Firebase)
      }

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
        timeoutRef.current = setTimeout(() => ejecutarPaso(segIdx, paso + 1), INTERVALO_MS)
      } else {
        // Llegó a la parada destino — registrar hora real
        tiemposRealesRef.current[segIdx + 1] = Date.now()

        if (segIdx + 1 < segmentos) {
          setProgreso(p => ({ ...p, paradaActual: destino.nombre, proximaParada: paradas[segIdx + 2]?.nombre ?? '', porcentajeSegmento: 0 }))
          timeoutRef.current = setTimeout(() => ejecutarPaso(segIdx + 1, 0), PAUSA_EN_PARADA_MS)
        } else {
          // Ruta completada — grabar historial
          await finalizarTransmision(rutaId)

          const hoy = new Date().toISOString().split('T')[0]
          const registroParadas = paradas.map((p, i) => {
            const horaEstimada = p.horaEstimada ?? '06:00'
            // Simular retraso aleatorio para hacer el reporte más interesante
            const offsetMin = retrasoAleatorio(0)
            const horaReal = horaConOffset(horaEstimada, offsetMin)
            return {
              paradaId: p.id,
              nombre: p.nombre,
              horaEstimada,
              horaReal,
              minutosRetraso: offsetMin,
            }
          })

          const aTiempo = registroParadas.filter(p => p.minutosRetraso <= 3).length
          const puntualidad = Math.round((aTiempo / registroParadas.length) * 100)

          await guardarRegistroViaje({
            rutaId,
            orgId: ORG_DEMO,
            nombreRuta: nombreRuta || rutaId,
            fecha: hoy,
            inicioReal: inicioRef.current,
            finReal: Date.now(),
            paradas: registroParadas,
            puntualidad,
          })

          setProgreso(p => ({ ...p, estado: 'completado', porcentajeSegmento: 100 }))
        }
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
  }, [rutaId, paradas, nombreRuta])

  const reanudar = useCallback(() => {
    iniciar(progreso.segmentoActual)
  }, [iniciar, progreso.segmentoActual])

  return { progreso, iniciar, detener, pausar, reanudar }
}
