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
  const paradaMarkerRef = useRef<unknown>(null)

  // Inicializar mapa Leaflet (solo client-side)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Importación dinámica para evitar SSR
    import('leaflet').then((L) => {
      // Fix default icons en Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([paradaLat, paradaLng], 14)
      mapInstanceRef.current = map

      // Mapa CARTO Dark (mismo que el demo original)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        }
      ).addTo(map)

      // Marker de la parada del trabajador
      const paradaIcon = L.divIcon({
        html: `<div style="background:#0f766e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      const paradaMarker = L.marker([paradaLat, paradaLng], { icon: paradaIcon })
        .addTo(map)
        .bindPopup(`📍 Tu parada: ${paradaNombre}`)
        .openPopup()
      paradaMarkerRef.current = paradaMarker
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
        camionMarkerRef.current = null
        paradaMarkerRef.current = null
      }
    }
    // Solo corre una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar posición del camión en tiempo real
  useEffect(() => {
    if (!mapInstanceRef.current || !ubicacionCamion) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>
      const { lat, lng } = ubicacionCamion

      const camionIcon = L.divIcon({
        html: `<div style="background:#f59e0b;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(245,158,11,0.6)"></div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      if (camionMarkerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(camionMarkerRef.current as any).setLatLng([lat, lng])
      } else {
        const marker = L.marker([lat, lng], { icon: camionIcon })
          .addTo(map)
          .bindPopup('🚌 Tu camión')
        camionMarkerRef.current = marker
      }

      // Centrar mapa entre camión y parada
      const bounds = L.latLngBounds([[lat, lng], [paradaLat, paradaLng]])
      map.fitBounds(bounds, { padding: [50, 50] })
    })
  }, [ubicacionCamion, paradaLat, paradaLng])

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </>
  )
}
