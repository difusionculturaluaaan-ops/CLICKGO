/**
 * Cliente OSRM — routing gratuito por calles reales
 * Docs: http://project-osrm.org/docs/v5.24.0/api/
 */

export interface Waypoint {
  lat: number
  lng: number
}

/**
 * Obtiene los waypoints de la ruta real por calles entre dos puntos.
 * OSRM usa orden lng,lat (no lat,lng).
 */
export async function obtenerRutaCalles(
  origen: Waypoint,
  destino: Waypoint
): Promise<Waypoint[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origen.lng},${origen.lat};${destino.lng},${destino.lat}` +
    `?overview=full&geometries=geojson`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)

    const data = await res.json()
    const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? []

    // OSRM devuelve [lng, lat] — invertir a { lat, lng }
    return coords.map(([lng, lat]) => ({ lat, lng }))
  } catch {
    // Fallback: línea recta si OSRM no responde
    return [origen, destino]
  }
}

/**
 * Pre-carga todas las rutas por calles para un arreglo de paradas.
 * Retorna un arreglo de segmentos, cada uno con sus waypoints reales.
 */
export async function precargarSegmentos(
  paradas: Array<{ lat: number; lng: number }>
): Promise<Waypoint[][]> {
  const segmentos: Waypoint[][] = []
  for (let i = 0; i < paradas.length - 1; i++) {
    const wps = await obtenerRutaCalles(paradas[i], paradas[i + 1])
    segmentos.push(wps)
  }
  return segmentos
}
