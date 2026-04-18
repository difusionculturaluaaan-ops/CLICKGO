'use client'
import { useState, useEffect, useRef } from 'react'
import { escucharUbicacion, calcularETA } from '@/shared/lib/firebase/database'
import { mostrarNotificacionLocal } from '@/shared/lib/firebase/messaging'
import type { Ubicacion, ETAResult } from '@/shared/types'

interface ReceiverState {
  ubicacion: Ubicacion | null
  eta: ETAResult | null
  conectado: boolean
}

export function useGPSReceiver(
  rutaId: string | null,
  paradaLat: number,
  paradaLng: number,
  paradaId?: string | null,
  orgId?: string | null,
) {
  const [state, setState] = useState<ReceiverState>({
    ubicacion: null,
    eta: null,
    conectado: false,
  })

  const notificadoRef = useRef<{ yaViene: boolean; llegando: boolean }>({
    yaViene: false,
    llegando: false,
  })

  useEffect(() => {
    if (!rutaId) return

    notificadoRef.current = { yaViene: false, llegando: false }

    const unsub = escucharUbicacion(rutaId, (ubicacion) => {
      if (!ubicacion) {
        setState({ ubicacion: null, eta: null, conectado: true })
        return
      }

      const eta = calcularETA(ubicacion, paradaLat, paradaLng)
      setState({ ubicacion, eta, conectado: true })

      if (eta.estado === 'ya_viene' && !notificadoRef.current.yaViene) {
        notificadoRef.current.yaViene = true
        mostrarNotificacionLocal(
          '⚡ ¡Ya viene tu camión!',
          `Llegará en aproximadamente ${eta.minutos} minutos. Prepárate.`
        )
        // Notificar a trabajadores con app cerrada via FCM
        if (paradaId && orgId) {
          fetch('/api/notificaciones/camion-viene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rutaId,
              paradaId,
              orgId,
              mensaje: `Llegará en aproximadamente ${eta.minutos} minutos. Prepárate.`,
            }),
          }).catch(() => {})
        }
      }

      if (eta.estado === 'llegando' && !notificadoRef.current.llegando) {
        notificadoRef.current.llegando = true
        mostrarNotificacionLocal(
          '🟢 ¡El camión está llegando!',
          'Sal ahora a tu parada.'
        )
        if (paradaId && orgId) {
          fetch('/api/notificaciones/camion-viene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rutaId,
              paradaId,
              orgId,
              mensaje: '¡Sal ahora a tu parada! El camión está llegando.',
            }),
          }).catch(() => {})
        }
      }

      if (eta.estado === 'en_camino' && eta.minutos > 8) {
        notificadoRef.current = { yaViene: false, llegando: false }
      }
    })

    return () => {
      unsub()
      setState((prev) => ({ ...prev, conectado: false }))
    }
  }, [rutaId, paradaLat, paradaLng, paradaId, orgId])

  return state
}
