'use client'
import { useEffect, useRef, useState } from 'react'
import { calcularDistanciaHaversine, crearOActualizarUsuario } from '@/shared/lib/firebase/database'
import { mostrarNotificacionLocal } from '@/shared/lib/firebase/messaging'

const VELOCIDAD_M_POR_MIN = 70  // ~5km/h con factor calles
const BUFFER_MIN = 2            // margen de seguridad

interface SalidaCasaState {
  tiempoCaminataMin: number     // minutos estimados de casa a parada
  minutosParaSalir: number | null  // null si el camión está muy lejos aún
  debesSalirAhora: boolean
  distanciaMetros: number
}

interface Props {
  posWorker: { lat: number; lng: number } | null
  paradaLat: number
  paradaLng: number
  etaCamionMin: number | null  // ETA del camión a la parada, en minutos
  paradaId: string | null
  orgId: string | null
  rutaId: string | null
  userId: string | null
  tiempoCaminataGuardado?: number | null  // del perfil del usuario si ya existe
}

export function useSalidaCasa({
  posWorker,
  paradaLat,
  paradaLng,
  etaCamionMin,
  paradaId,
  orgId,
  rutaId,
  userId,
  tiempoCaminataGuardado,
}: Props): SalidaCasaState {

  const notificadoRef = useRef(false)
  const tiempoRegistradoRef = useRef(false)

  const [state, setState] = useState<SalidaCasaState>({
    tiempoCaminataMin: tiempoCaminataGuardado ?? 10,
    minutosParaSalir: null,
    debesSalirAhora: false,
    distanciaMetros: 0,
  })

  useEffect(() => {
    if (!posWorker || paradaLat === 0 || paradaLng === 0) return

    const distanciaMetros = calcularDistanciaHaversine(
      posWorker.lat, posWorker.lng,
      paradaLat, paradaLng
    )

    // Usar tiempo guardado del perfil si existe, si no calcular por distancia
    const tiempoCaminataMin = tiempoCaminataGuardado
      ? tiempoCaminataGuardado
      : Math.ceil(distanciaMetros / VELOCIDAD_M_POR_MIN)

    let minutosParaSalir: number | null = null
    let debesSalirAhora = false

    if (etaCamionMin !== null) {
      minutosParaSalir = Math.round(etaCamionMin - tiempoCaminataMin - BUFFER_MIN)
      debesSalirAhora = minutosParaSalir <= 0

      // Notificar cuando es momento de salir (una sola vez por viaje)
      if (debesSalirAhora && !notificadoRef.current) {
        notificadoRef.current = true
        mostrarNotificacionLocal(
          '🚶 ¡Es momento de salir!',
          `El camión llega en ${etaCamionMin} min. Camina ${Math.ceil(tiempoCaminataMin)} min a tu parada.`
        )
        if (paradaId && orgId && rutaId) {
          fetch('/api/notificaciones/camion-viene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rutaId,
              paradaId,
              orgId,
              mensaje: `El camión llega en ${etaCamionMin} min. ¡Sal ahora a tu parada!`,
            }),
          }).catch(() => {})
        }
      }

      // Resetear si el camión se aleja de nuevo
      if (etaCamionMin > tiempoCaminataMin + BUFFER_MIN + 5) {
        notificadoRef.current = false
      }
    }

    setState({ tiempoCaminataMin, minutosParaSalir, debesSalirAhora, distanciaMetros })

    // Guardar tiempo de caminata real en el perfil (solo una vez, si fue calculado)
    if (!tiempoCaminataGuardado && !tiempoRegistradoRef.current && userId && distanciaMetros > 50) {
      tiempoRegistradoRef.current = true
      crearOActualizarUsuario(userId, { tiempoCaminataMin: Math.ceil(distanciaMetros / VELOCIDAD_M_POR_MIN) })
        .catch(() => {})
    }

  }, [posWorker, paradaLat, paradaLng, etaCamionMin, tiempoCaminataGuardado, paradaId, orgId, rutaId, userId])

  return state
}
