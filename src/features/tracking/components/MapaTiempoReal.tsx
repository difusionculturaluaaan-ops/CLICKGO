'use client'
import { useEffect, useRef } from 'react'
import type { Ubicacion } from '@/shared/types'

interface MapaTiempoRealProps {
  ubicacionCamion: Ubicacion | null
  paradaLat: number
  paradaLng: number
  paradaNombre: string
}

export function MapaTiempoReal({
  ubicacionCamion,
  paradaLat,
  paradaLng,
  paradaNombre,
}: MapaTiempoRealProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const camionMarkerRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Esperar al siguiente frame para asegurar que el DOM tiene dimensiones reales
    const rafId = requestAnimationFrame(() => {
      import('leaflet').then((L) => {
        if (!mapRef.current || mapInstanceRef.current) return

        // Limpiar si React Strict Mode montó dos veces
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const container = mapRef.current as any
        if (container._leaflet_id) container._leaflet_id = null

        // Fix iconos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapRef.current, { zoomControl: true })
        map.setView([paradaLat, paradaLng], 14)
        mapInstanceRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const paradaIcon = L.divIcon({
          html: `<div style="background:#0f766e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5)"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([paradaLat, paradaLng], { icon: paradaIcon })
          .addTo(map)
          .bindPopup(`📍 ${paradaNombre}`)

        // Recalcular tamaño si el contenedor cambia
        const ro = new ResizeObserver(() => map.invalidateSize())
        ro.observe(mapRef.current!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any)._ro = ro
      })
    })

    return () => {
      cancelAnimationFrame(rafId)
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mapInstanceRef.current as any
        m._ro?.disconnect()
        m.remove()
        mapInstanceRef.current = null
        camionMarkerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar posición del camión
  useEffect(() => {
    if (!mapInstanceRef.current || !ubicacionCamion) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>
      const { lat, lng } = ubicacionCamion

      const camionIcon = L.divIcon({
        html: `<div style="background:#f59e0b;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(245,158,11,0.7)"></div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      if (camionMarkerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(camionMarkerRef.current as any).setLatLng([lat, lng])
      } else {
        camionMarkerRef.current = L.marker([lat, lng], { icon: camionIcon })
          .addTo(map)
          .bindPopup('🚌 Tu camión')
      }

      map.fitBounds(
        L.latLngBounds([[lat, lng], [paradaLat, paradaLng]]),
        { padding: [40, 40] }
      )
    })
  }, [ubicacionCamion, paradaLat, paradaLng])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '55vh',
          overflow: 'hidden',
          backgroundColor: '#1a1a2e',
        }}
      />
    </>
  )
}
