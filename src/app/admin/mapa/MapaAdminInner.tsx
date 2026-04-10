'use client'
import { useEffect, useRef, useState } from 'react'
import type { RutaConUbicacion } from '@/features/admin/hooks/useRutasActivas'

// Colores por ruta (rotación)
const COLORES = [
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
]

interface MapaAdminInnerProps {
  rutas: RutaConUbicacion[]
  defaultLat: number
  defaultLng: number
}

export function MapaAdminInner({ rutas, defaultLat, defaultLng }: MapaAdminInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markersRef = useRef<Map<string, unknown>>(new Map())
  const paradasRef = useRef<Map<string, unknown[]>>(new Map())
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string | null>(null)

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = mapRef.current as any
      if (container._leaflet_id) container._leaflet_id = null

      const map = L.map(mapRef.current, { zoomControl: true })
      map.setView([defaultLat, defaultLng], 13)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

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
        markersRef.current.clear()
        paradasRef.current.clear()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar marcadores de camiones y paradas cuando cambian las rutas
  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>

      rutas.forEach((ruta, idx) => {
        const color = COLORES[idx % COLORES.length]
        const { ubicacion } = ruta

        // ── Paradas (solo si no las dibujamos antes) ──
        if (!paradasRef.current.has(ruta.id) && ruta.paradas?.length) {
          const paradaMarkers: unknown[] = []
          ruta.paradas.forEach((p) => {
            const icon = L.divIcon({
              html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid white;opacity:0.8"></div>`,
              className: '',
              iconSize: [10, 10],
              iconAnchor: [5, 5],
            })
            const m = L.marker([p.lat, p.lng], { icon })
              .addTo(map)
              .bindPopup(`<b style="color:${color}">${ruta.nombre}</b><br>📍 ${p.nombre}`)
            paradaMarkers.push(m)
          })
          paradasRef.current.set(ruta.id, paradaMarkers)
        }

        // ── Camión ──
        if (!ubicacion?.active) {
          // Sin señal activa — remover marcador si existía
          if (markersRef.current.has(ruta.id)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(markersRef.current.get(ruta.id) as any).remove()
            markersRef.current.delete(ruta.id)
          }
          return
        }

        const rot = ubicacion.heading ?? 0
        const velocidad = ubicacion.speed?.toFixed(0) ?? '0'
        const icon = L.divIcon({
          html: `<div style="position:relative;width:28px;height:28px">
            <div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;
              box-shadow:0 0 12px ${color}99;display:flex;align-items:center;justify-content:center;font-size:14px">
              🚌
            </div>
            <div style="position:absolute;top:-9px;left:50%;margin-left:-3px;width:0;height:0;
              border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:9px solid ${color};
              transform-origin:3px 15px;transform:rotate(${rot}deg)"></div>
          </div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const popupContent = `
          <b style="color:${color}">${ruta.nombre}</b><br>
          🚌 ${velocidad} km/h · ${ruta.unidad ?? ''}<br>
          <span style="color:#888;font-size:11px">Chofer: ${ruta.choferAsignado ?? 'sin asignar'}</span>
        `

        if (markersRef.current.has(ruta.id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const marker = markersRef.current.get(ruta.id) as any
          marker.setLatLng([ubicacion.lat, ubicacion.lng])
          marker.setIcon(icon)
          marker.setPopupContent(popupContent)
        } else {
          const marker = L.marker([ubicacion.lat, ubicacion.lng], { icon })
            .addTo(map)
            .bindPopup(popupContent)
          markersRef.current.set(ruta.id, marker)
        }
      })

      // Si hay camiones activos y no hay ruta seleccionada, centrar en todos
      const activos = rutas.filter(r => r.ubicacion?.active)
      if (activos.length > 0 && !rutaSeleccionada) {
        const lats = activos.map(r => r.ubicacion!.lat)
        const lngs = activos.map(r => r.ubicacion!.lng)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        if (lats.length === 1) {
          map.setView([lats[0], lngs[0]], 14)
        } else {
          map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [60, 60] })
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutas])

  // Centrar en ruta seleccionada
  useEffect(() => {
    if (!rutaSeleccionada || !mapInstanceRef.current) return
    const ruta = rutas.find(r => r.id === rutaSeleccionada)
    if (!ruta?.ubicacion?.active) return
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>
      map.setView([ruta.ubicacion!.lat, ruta.ubicacion!.lng], 15)
      const marker = markersRef.current.get(rutaSeleccionada)
      if (marker) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(marker as any).openPopup()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaSeleccionada])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Leyenda lateral */}
      <div className="absolute top-3 right-3 z-[1000] bg-gray-900/90 backdrop-blur rounded-2xl p-3 max-w-[200px] max-h-[80vh] overflow-y-auto shadow-xl">
        <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Rutas</p>
        <div className="space-y-1.5">
          {rutas.map((ruta, idx) => {
            const color = COLORES[idx % COLORES.length]
            const activo = !!ruta.ubicacion?.active
            return (
              <button
                key={ruta.id}
                onClick={() => setRutaSeleccionada(ruta.id === rutaSeleccionada ? null : ruta.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${
                  rutaSeleccionada === ruta.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: color, boxShadow: activo ? `0 0 6px ${color}` : 'none' }}
                />
                <span className="text-white text-xs truncate">{ruta.nombre}</span>
                {activo
                  ? <span className="ml-auto text-green-400 text-xs shrink-0">●</span>
                  : <span className="ml-auto text-gray-600 text-xs shrink-0">○</span>
                }
              </button>
            )
          })}
        </div>
        {rutas.length === 0 && (
          <p className="text-gray-500 text-xs">Sin rutas</p>
        )}
      </div>

      {/* Mapa */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
    </>
  )
}
