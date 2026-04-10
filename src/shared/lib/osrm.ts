/**
 * Cliente de ruteo por calles reales — OSRM con fallback a endpoint alternativo
 */

export interface Waypoint {
  lat: number
  lng: number
}

// Endpoints OSRM en orden de preferencia
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
]

/**
 * Obtiene waypoints por calles reales entre dos puntos.
 * Intenta múltiples endpoints con retry antes de caer en línea recta.
 */
export async function obtenerRutaCalles(
  origen: Waypoint,
  destino: Waypoint
): Promise<Waypoint[]> {
  const coords = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`
  const params = '?overview=full&geometries=geojson'

  for (const endpoint of OSRM_ENDPOINTS) {
    // Hasta 2 intentos por endpoint
    for (let intento = 0; intento < 2; intento++) {
      try {
        const res = await fetch(`${endpoint}/${coords}${params}`, {
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) throw new Error(`OSRM ${res.status}`)

        const data = await res.json()
        const geometry: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? []

        if (geometry.length >= 2) {
          // OSRM devuelve [lng, lat] — invertir a { lat, lng }
          return geometry.map(([lng, lat]) => ({ lat, lng }))
        }
        throw new Error('Sin geometría')
      } catch {
        // Esperar antes de reintentar
        if (intento === 0) await new Promise(r => setTimeout(r, 600))
      }
    }
  }

  // Fallback final: interpolar puntos intermedios para suavizar la línea recta
  return interpolarLinea(origen, destino, 8)
}

/**
 * Genera N puntos intermedios entre dos coordenadas (fallback cuando OSRM no responde).
 * Mejor que solo dos puntos — al menos mantiene velocidad y heading consistentes.
 */
function interpolarLinea(origen: Waypoint, destino: Waypoint, pasos: number): Waypoint[] {
  const puntos: Waypoint[] = []
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    puntos.push({
      lat: origen.lat + (destino.lat - origen.lat) * t,
      lng: origen.lng + (destino.lng - origen.lng) * t,
    })
  }
  return puntos
}

/**
 * Pre-carga todos los segmentos entre paradas con rutas por calles reales.
 */
export async function precargarSegmentos(
  paradas: Array<{ lat: number; lng: number }>
): Promise<Waypoint[][]> {
  // Paralelo — más rápido que secuencial
  return Promise.all(
    paradas.slice(0, -1).map((p, i) => obtenerRutaCalles(p, paradas[i + 1]))
  )
}
