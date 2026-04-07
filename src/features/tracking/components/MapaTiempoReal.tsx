'use client'
import { useEffect, useRef } from 'react'
import type { Ubicacion } from '@/shared/types'

const TILES = {
  oscuro: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  claro: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
}

interface MapaTiempoRealProps {
  ubicacionCamion: Ubicacion | null
  paradaLat: number
  paradaLng: number
  paradaNombre: string
  userLat?: number
  userLng?: number
  tema?: 'oscuro' | 'claro'
}

export function MapaTiempoReal({
  ubicacionCamion,
  paradaLat,
  paradaLng,
  paradaNombre,
  userLat,
  userLng,
  tema = 'oscuro',
}: MapaTiempoRealProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const camionMarkerRef = useRef<unknown>(null)
  const userMarkerRef = useRef<unknown>(null)
  const trailRef = useRef<unknown>(null)
  const trailPointsRef = useRef<[number, number][]>([])
  const tileLayerRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const rafId = requestAnimationFrame(() => {
      import('leaflet').then((L) => {
        if (!mapRef.current || mapInstanceRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const container = mapRef.current as any
        if (container._leaflet_id) container._leaflet_id = null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapRef.current, { zoomControl: true })
        map.setView([paradaLat || 25.4232, paradaLng || -100.9963], 14)
        mapInstanceRef.current = map

        // Tiles iniciales según tema
        const t = TILES[tema]
        tileLayerRef.current = L.tileLayer(t.url, {
          attribution: t.attribution,
          subdomains: t.subdomains,
          maxZoom: 20,
        }).addTo(map)

        // Parada marker
        const paradaIcon = L.divIcon({
          html: `<div style="background:#0f766e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(15,118,110,0.8)"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([paradaLat, paradaLng], { icon: paradaIcon })
          .addTo(map)
          .bindPopup(`📍 ${paradaNombre}`)

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
        userMarkerRef.current = null
        trailRef.current = null
        tileLayerRef.current = null
        trailPointsRef.current = []
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambiar tiles cuando cambia el tema
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(tileLayerRef.current as any).remove()
      const t = TILES[tema]
      tileLayerRef.current = L.tileLayer(t.url, {
        attribution: t.attribution,
        subdomains: t.subdomains,
        maxZoom: 20,
      }).addTo(map)
    })
  }, [tema])

  // Actualizar posición del camión + trail
  useEffect(() => {
    if (!mapInstanceRef.current || !ubicacionCamion) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>
      const { lat, lng, heading } = ubicacionCamion

      // Trail polyline
      trailPointsRef.current.push([lat, lng])
      if (trailPointsRef.current.length > 200) trailPointsRef.current.shift()

      if (trailRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(trailRef.current as any).setLatLngs(trailPointsRef.current)
      } else {
        trailRef.current = L.polyline(trailPointsRef.current, {
          color: '#00D4AA',
          weight: 3,
          opacity: 0.75,
        }).addTo(map)
      }

      // Bus marker with heading arrow
      const rot = heading ?? 0
      const camionIcon = L.divIcon({
        html: `<div style="position:relative;width:22px;height:22px">
          <div style="background:#f59e0b;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(245,158,11,0.8)"></div>
          <div style="position:absolute;top:-8px;left:50%;margin-left:-3px;width:0;height:0;
            border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:8px solid #f59e0b;
            transform-origin:3px 14px;transform:rotate(${rot}deg)"></div>
        </div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      if (camionMarkerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(camionMarkerRef.current as any).setLatLng([lat, lng])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(camionMarkerRef.current as any).setIcon(camionIcon)
      } else {
        camionMarkerRef.current = L.marker([lat, lng], { icon: camionIcon })
          .addTo(map)
          .bindPopup('🚌 Tu camión')
      }

      // Solo ajustar bounds si el bus está cerca (<50 km de la parada)
      const dLat = lat - paradaLat, dLng = lng - paradaLng
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111
      if (distKm < 50) {
        map.fitBounds(
          L.latLngBounds([[lat, lng], [paradaLat, paradaLng]]),
          { padding: [40, 40] }
        )
      } else {
        map.setView([paradaLat, paradaLng], 14)
      }
    })
  }, [ubicacionCamion, paradaLat, paradaLng])

  // Posición del trabajador en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current || userLat == null || userLng == null) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>

      const userIcon = L.divIcon({
        html: `<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.9)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      if (userMarkerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(userMarkerRef.current as any).setLatLng([userLat, userLng])
      } else {
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup('📍 Tu ubicación')
      }
    })
  }, [userLat, userLng])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          backgroundColor: '#1a1a2e',
        }}
      />
    </>
  )
}
