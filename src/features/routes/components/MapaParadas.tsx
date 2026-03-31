'use client'
import { useEffect, useRef } from 'react'
import type { Parada } from '@/shared/types'

interface MapaParadasProps {
  paradas: Parada[]
  onChange: (paradas: Parada[]) => void
}

// Centro de Saltillo
const CENTER: [number, number] = [25.4232, -100.9963]

export function MapaParadas({ paradas, onChange }: MapaParadasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markersRef = useRef<unknown[]>([])
  const paradasRef = useRef<Parada[]>(paradas)

  // Mantener ref sincronizada sin re-montar el mapa
  useEffect(() => { paradasRef.current = paradas }, [paradas])

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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const ro = new ResizeObserver(() => map.invalidateSize())
        ro.observe(mapRef.current!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any)._ro = ro

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
        markersRef.current = []
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincronizar markers con paradas
  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>

      // Limpiar markers anteriores
      markersRef.current.forEach((m) => (m as ReturnType<typeof L.marker>).remove())
      markersRef.current = []

      // Dibujar markers actuales
      paradas.forEach((p, i) => {
        const icon = L.divIcon({
          html: `<div style="background:#0f766e;color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${i + 1}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
        const marker = L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`${i + 1}. ${p.nombre}`)
        markersRef.current.push(marker)
      })

      // Ajustar vista si hay paradas
      if (paradas.length > 0) {
        const bounds = L.latLngBounds(paradas.map(p => [p.lat, p.lng]))
        map.fitBounds(bounds, { padding: [30, 30] })
      }
    })
  }, [paradas])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        style={{ width: '100%', height: '260px', overflow: 'hidden', borderRadius: '12px', cursor: 'crosshair' }}
      />
      <p className="text-xs text-gray-400 mt-2 text-center">
        📍 Toca el mapa para agregar una parada
      </p>
    </>
  )
}
