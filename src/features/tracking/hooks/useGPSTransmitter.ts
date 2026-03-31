'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { escribirUbicacion, finalizarTransmision } from '@/shared/lib/firebase/database'

type EstadoTransmision = 'inactivo' | 'activo' | 'error' | 'sin_gps'

interface GPSState {
  estado: EstadoTransmision
  ultimaUbicacion: { lat: number; lng: number; speed: number } | null
  contadorActualizaciones: number
  error: string | null
}

export function useGPSTransmitter(rutaId: string | null, intervaloSegs = 12) {
  const [gps, setGPS] = useState<GPSState>({
    estado: 'inactivo',
    ultimaUbicacion: null,
    contadorActualizaciones: 0,
    error: null,
  })

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const ultimaPosRef = useRef<GeolocationPosition | null>(null)

  const detener = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (rutaId) {
      await finalizarTransmision(rutaId)
    }
    setGPS((prev) => ({ ...prev, estado: 'inactivo' }))
  }, [rutaId])

  const iniciar = useCallback(() => {
    if (!rutaId) return
    if (!('geolocation' in navigator)) {
      setGPS((prev) => ({ ...prev, estado: 'sin_gps', error: 'GPS no disponible en este dispositivo' }))
      return
    }

    setGPS((prev) => ({ ...prev, estado: 'activo', error: null }))

    // Escucha continua de posición (alta precisión)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => { ultimaPosRef.current = pos },
      (err) => {
        setGPS((prev) => ({ ...prev, estado: 'error', error: `GPS: ${err.message}` }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    // Envía a Firebase cada N segundos
    intervalRef.current = setInterval(async () => {
      const pos = ultimaPosRef.current
      if (!pos || !rutaId) return

      const { latitude: lat, longitude: lng, speed, heading, accuracy } = pos.coords
      const speedKmh = speed != null ? speed * 3.6 : 0

      try {
        await escribirUbicacion(rutaId, {
          lat,
          lng,
          speed: Math.round(speedKmh),
          heading: heading ?? 0,
          accuracy: Math.round(accuracy),
          active: true,
        })
        setGPS((prev) => ({
          ...prev,
          estado: 'activo',
          ultimaUbicacion: { lat, lng, speed: Math.round(speedKmh) },
          contadorActualizaciones: prev.contadorActualizaciones + 1,
        }))
      } catch {
        setGPS((prev) => ({ ...prev, estado: 'error', error: 'Error al enviar ubicación' }))
      }
    }, intervaloSegs * 1000)
  }, [rutaId, intervaloSegs])

  // Limpieza al desmontar
  useEffect(() => {
    return () => { detener() }
  }, [detener])

  return { gps, iniciar, detener }
}
