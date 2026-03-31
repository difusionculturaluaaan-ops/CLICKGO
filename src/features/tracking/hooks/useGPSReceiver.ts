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
  paradaLng: number
) {
  const [state, setState] = useState<ReceiverState>({
    ubicacion: null,
    eta: null,
    conectado: false,
  })

  // Rastrear notificaciones ya enviadas para no repetirlas
  const notificadoRef = useRef<{ yaViene: boolean; llegando: boolean }>({
    yaViene: false,
    llegando: false,
  })

  useEffect(() => {
    if (!rutaId) return

    // Resetear notificaciones cuando cambia la ruta
    notificadoRef.current = { yaViene: false, llegando: false }
    setState((prev) => ({ ...prev, conectado: true }))

    const unsub = escucharUbicacion(rutaId, (ubicacion) => {
      if (!ubicacion) {
        setState({ ubicacion: null, eta: null, conectado: true })
        return
      }

      const eta = calcularETA(ubicacion, paradaLat, paradaLng)
      setState({ ubicacion, eta, conectado: true })

      // ── Push notifications locales ─────────────────────────────────────
      if (eta.estado === 'ya_viene' && !notificadoRef.current.yaViene) {
        notificadoRef.current.yaViene = true
        mostrarNotificacionLocal(
          '⚡ ¡Ya viene tu camión!',
          `Llegará en aproximadamente ${eta.minutos} minutos. Prepárate.`
        )
      }

      if (eta.estado === 'llegando' && !notificadoRef.current.llegando) {
        notificadoRef.current.llegando = true
        mostrarNotificacionLocal(
          '🟢 ¡El camión está llegando!',
          'Sal ahora a tu parada.'
        )
      }

      // Resetear si el camión se aleja (para permitir nueva notificación)
      if (eta.estado === 'en_camino' && eta.minutos > 8) {
        notificadoRef.current = { yaViene: false, llegando: false }
      }
    })

    return () => {
      unsub()
      setState((prev) => ({ ...prev, conectado: false }))
    }
  }, [rutaId, paradaLat, paradaLng])

  return state
}
