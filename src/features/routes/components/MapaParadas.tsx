'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { Parada } from '@/shared/types'

interface MapaParadasProps {
  paradas: Parada[]
  onChange: (paradas: Parada[]) => void
}

const CENTER: [number, number] = [25.4232, -100.9963]

export function MapaParadas({ paradas, onChange }: MapaParadasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markersRef = useRef<unknown[]>([])
  const paradasRef = useRef<Parada[]>(paradas)
  const leafletRef = useRef<unknown>(null)

  // Mantener ref sincronizada sin re-montar el mapa
  useEffect(() => { paradasRef.current = paradas }, [paradas])

  // Función reutilizable para dibujar markers — usada al init y en cada cambio
  const dibujarMarkers = useCallback((L: unknown, map: unknown, pts: Parada[]) => {
    const Lx = L as typeof import('leaflet')
    const mx = map as ReturnType<typeof Lx.map>

    markersRef.current.forEach(m => (m as ReturnType<typeof Lx.marker>).remove())
    markersRef.current = []

    pts.forEach((p, i) => {
      const icon = Lx.divIcon({
        html: `<div style="background:#0f766e;color:white;width:24px;height:24px;border-radius:50%;
          border:2px solid white;display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${i + 1}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const marker = Lx.marker([p.lat, p.lng], { icon })
        .addTo(mx)
        .bindPopup(`${i + 1}. ${p.nombre}`)
      markersRef.current.push(marker)
    })

    if (pts.length > 0) {
      const bounds = Lx.latLngBounds(pts.map(p => [p.lat, p.lng] as [number, number]))
      mx.fitBounds(bounds, { padding: [30, 30] })
    }
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const rafId = requestAnimationFrame(() => {
      import('leaflet').then((L) => {
        if (!mapRef.current || mapInstanceRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const container = mapRef.current as any
        if (container._leaflet_id) container._leaflet_id = null

        const map = L.map(mapRef.current).setView(CENTER, 13)
        mapInstanceRef.current = map
        leafletRef.current = L

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const ro = new ResizeObserver(() => map.invalidateSize())
        ro.observe(mapRef.current!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any)._ro = ro

        // Dibujar paradas existentes inmediatamente (caso edición)
        if (paradasRef.current.length > 0) {
          dibujarMarkers(L, map, paradasRef.current)
        }

        // Click en mapa → agrega parada
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          const { lat, lng } = e.latlng
          const nuevaParada: Parada = {
            id: `p${Date.now()}`,
            nombre: `Parada ${paradasRef.current.length + 1}`,
            lat,
            lng,
            orden: paradasRef.current.length + 1,
          }
          const actualizadas = [...paradasRef.current, nuevaParada]
          paradasRef.current = actualizadas
          onChange(actualizadas)
        })
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
        leafletRef.current = null
        markersRef.current = []
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincronizar markers cuando cambian las paradas (después del init)
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return
    dibujarMarkers(leafletRef.current, mapInstanceRef.current, paradas)
  }, [paradas, dibujarMarkers])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '12px', cursor: 'crosshair' }}
      />
      <p className="text-xs text-gray-400 mt-2 text-center">
        📍 Toca el mapa para agregar una parada · Las paradas existentes aparecen al abrir
      </p>
    </>
  )
}
