'use client'
import { useState, useEffect } from 'react'
import { escucharUbicacion, calcularETA } from '@/shared/lib/firebase/database'
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

  useEffect(() => {
    if (!rutaId) return

    setState((prev) => ({ ...prev, conectado: true }))

    const unsub = escucharUbicacion(rutaId, (ubicacion) => {
      if (!ubicacion) {
        setState({ ubicacion: null, eta: null, conectado: true })
        return
      }

      const eta = calcularETA(ubicacion, paradaLat, paradaLng)
      setState({ ubicacion, eta, conectado: true })
    })

    return () => {
      unsub()
      setState((prev) => ({ ...prev, conectado: false }))
    }
  }, [rutaId, paradaLat, paradaLng])

  return state
}
