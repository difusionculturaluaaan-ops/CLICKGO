'use client'
import { useEffect, useRef } from 'react'
import type { PuntoTrail } from '@/shared/lib/firebase/database'
import type { Parada } from '@/shared/types'

interface TrailMapInnerProps {
  trail: PuntoTrail[]
  paradas: Parada[]
}

const DESVIACION_UMBRAL_M = 200

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanciaPuntoAPolilinea(lat: number, lng: number, paradas: Parada[]): number {
  if (paradas.length === 0) return 0
  let minDist = Infinity
  for (const p of paradas) {
    const d = distanciaMetros(lat, lng, p.lat, p.lng)
    if (d < minDist) minDist = d
  }
  return minDist
}

export function TrailMapInner({ trail, paradas }: TrailMapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || paradas.length === 0) return

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = mapRef.current as any
      if (container._leaflet_id) container._leaflet_id = null

      const map = L.map(mapRef.current, { zoomControl: true })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      // ── Ruta oficial (azul) ──────────────────────────────────────────────────
      const coordsOficial: [number, number][] = paradas.map(p => [p.lat, p.lng])
      L.polyline(coordsOficial, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '8 4' })
        .addTo(map)
        .bindPopup('Ruta oficial')

      // Marcadores de paradas
      paradas.forEach((p, i) => {
        const icon = L.divIcon({
          html: `<div style="background:#3b82f6;color:white;width:22px;height:22px;border-radius:50%;
            border:2px solid white;display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,.3)">${i + 1}</div>`,
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`📍 ${p.nombre}`)
      })

      // ── Trail real (naranja / rojo si desvío) ─────────────────────────────────
      if (trail.length >= 2) {
        // Separar trail en segmentos según si está dentro o fuera del corredor
        let segmentoActual: [number, number][] = []
        let dentroActual: boolean | null = null

        const cerrarSegmento = (dentro: boolean) => {
          if (segmentoActual.length >= 2) {
            L.polyline(segmentoActual, {
              color: dentro ? '#f97316' : '#ef4444',
              weight: dentro ? 4 : 5,
              opacity: 0.9,
            }).addTo(map).bindPopup(dentro ? 'Recorrido real' : `⚠️ Desvío detectado`)
          }
          segmentoActual = []
        }

        trail.forEach(pt => {
          const dist = distanciaPuntoAPolilinea(pt.lat, pt.lng, paradas)
          const dentro = dist <= DESVIACION_UMBRAL_M

          if (dentroActual !== null && dentro !== dentroActual) {
            // Cambio de estado — cerrar segmento anterior y empezar nuevo
            segmentoActual.push([pt.lat, pt.lng]) // punto de transición
            cerrarSegmento(dentroActual)
          }

          segmentoActual.push([pt.lat, pt.lng])
          dentroActual = dentro
        })

        if (dentroActual !== null) cerrarSegmento(dentroActual)

        // Marcador inicio y fin del trail
        const primero = trail[0]
        const ultimo = trail[trail.length - 1]

        L.circleMarker([primero.lat, primero.lng], { radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 })
          .addTo(map).bindPopup(`🟢 Inicio · ${new Date(primero.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`)

        L.circleMarker([ultimo.lat, ultimo.lng], { radius: 7, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 })
          .addTo(map).bindPopup(`🔴 Fin · ${new Date(ultimo.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`)
      }

      // ── Ajustar vista ──────────────────────────────────────────────────────────
      const todosPuntos: [number, number][] = [
        ...paradas.map(p => [p.lat, p.lng] as [number, number]),
        ...trail.map(p => [p.lat, p.lng] as [number, number]),
      ]
      if (todosPuntos.length > 0) {
        map.fitBounds(L.latLngBounds(todosPuntos), { padding: [30, 30] })
      }

      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(mapRef.current!)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map as any)._ro = ro
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mapInstanceRef.current as any
        m._ro?.disconnect()
        m.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ width: '100%', height: '320px' }} />
    </>
  )
}
