import {
  ref,
  set,
  onValue,
  off,
  serverTimestamp,
  get,
  update,
  push,
  remove,
} from 'firebase/database'
import { db } from './config'
import type { Ubicacion, Ruta, Usuario, Organization, ETAResult } from '@/shared/types'

// ─── Ubicación GPS ────────────────────────────────────────────────────────────

/**
 * Escribe la ubicación actual del camión en /ubicaciones/{rutaId}
 * Llamar cada 10-15 segundos desde la app del chofer
 */
export function escribirUbicacion(rutaId: string, ubicacion: Omit<Ubicacion, 'timestamp'>): Promise<void> {
  const ubicacionRef = ref(db, `ubicaciones/${rutaId}`)
  return set(ubicacionRef, {
    ...ubicacion,
    timestamp: Date.now(),
  })
}

/**
 * Escucha cambios en tiempo real de la ubicación de un camión
 * Retorna función para cancelar la suscripción
 */
export function escucharUbicacion(
  rutaId: string,
  callback: (ubicacion: Ubicacion | null) => void
): () => void {
  const ubicacionRef = ref(db, `ubicaciones/${rutaId}`)
  onValue(ubicacionRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as Ubicacion) : null)
  })
  return () => off(ubicacionRef)
}

/**
 * Marca la ruta como inactiva al finalizar
 */
export function finalizarTransmision(rutaId: string): Promise<void> {
  const ubicacionRef = ref(db, `ubicaciones/${rutaId}/active`)
  return set(ubicacionRef, false)
}

// ─── Cálculo de ETA ───────────────────────────────────────────────────────────

/**
 * Calcula ETA basado en distancia y velocidad actual del camión
 */
export function calcularETA(
  ubicacionCamion: Ubicacion,
  paradaLat: number,
  paradaLng: number
): ETAResult {
  const distanciaMetros = calcularDistanciaHaversine(
    ubicacionCamion.lat,
    ubicacionCamion.lng,
    paradaLat,
    paradaLng
  )

  const velocidadMs = (ubicacionCamion.speed / 3.6) || 8.33 // fallback 30 km/h si speed=0
  const segundos = distanciaMetros / velocidadMs
  const minutos = Math.ceil(segundos / 60)

  let estado: ETAResult['estado']
  if (!ubicacionCamion.active) estado = 'sin_senal'
  else if (minutos <= 2) estado = 'llegando'
  else if (minutos <= 5) estado = 'ya_viene'
  else estado = 'en_camino'

  return { minutos, distanciaMetros: Math.round(distanciaMetros), estado }
}

function calcularDistanciaHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

export async function obtenerRuta(rutaId: string): Promise<Ruta | null> {
  const snap = await get(ref(db, `rutas/${rutaId}`))
  return snap.exists() ? (snap.val() as Ruta) : null
}

export async function obtenerRutasPorOrg(orgId: string): Promise<Ruta[]> {
  const snap = await get(ref(db, 'rutas'))
  if (!snap.exists()) return []
  const todas = snap.val() as Record<string, Ruta>
  return Object.values(todas).filter((r) => r.orgId === orgId)
}

export function escucharRutasActivas(
  orgId: string,
  callback: (rutas: Ruta[]) => void
): () => void {
  const rutasRef = ref(db, 'rutas')
  onValue(rutasRef, (snapshot) => {
    if (!snapshot.exists()) { callback([]); return }
    const todas = snapshot.val() as Record<string, Ruta>
    const activas = Object.entries(todas)
      .filter(([, r]) => r.orgId === orgId && r.estado === 'activa')
      .map(([id, r]) => ({ ...r, id }))
    callback(activas)
  })
  return () => off(rutasRef)
}

export function actualizarEstadoRuta(rutaId: string, estado: Ruta['estado']): Promise<void> {
  return update(ref(db, `rutas/${rutaId}`), { estado })
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export async function obtenerUsuario(userId: string): Promise<Usuario | null> {
  const snap = await get(ref(db, `usuarios/${userId}`))
  return snap.exists() ? (snap.val() as Usuario) : null
}

export async function crearOActualizarUsuario(userId: string, datos: Partial<Usuario>): Promise<void> {
  return update(ref(db, `usuarios/${userId}`), datos)
}

// ─── Organizaciones ───────────────────────────────────────────────────────────

export async function obtenerOrganizacion(orgId: string): Promise<Organization | null> {
  const snap = await get(ref(db, `organizaciones/${orgId}`))
  return snap.exists() ? (snap.val() as Organization) : null
}

export async function listarOrganizaciones(): Promise<Organization[]> {
  const snap = await get(ref(db, 'organizaciones'))
  if (!snap.exists()) return []
  return Object.entries(snap.val() as Record<string, Organization>).map(([id, org]) => ({
    ...org,
    id,
  }))
}

// ─── Historial de puntualidad ──────────────────────────────────────────────────

export interface RegistroParada {
  paradaId: string
  nombre: string
  horaEstimada: string   // "06:25"
  horaReal: string       // "06:27"
  minutosRetraso: number // negativo = adelantado
}

export interface RegistroViaje {
  id: string
  rutaId: string
  orgId: string
  nombreRuta: string
  fecha: string          // "2026-03-31"
  inicioReal: number     // timestamp ms
  finReal: number
  paradas: RegistroParada[]
  puntualidad: number    // 0-100 (% de paradas a tiempo)
}

export async function guardarRegistroViaje(viaje: Omit<RegistroViaje, 'id'>): Promise<void> {
  const newRef = push(ref(db, `historial/${viaje.orgId}`))
  await set(newRef, { ...viaje, id: newRef.key })
}

export async function obtenerHistorial(orgId: string): Promise<RegistroViaje[]> {
  const snap = await get(ref(db, `historial/${orgId}`))
  if (!snap.exists()) return []
  return Object.values(snap.val() as Record<string, RegistroViaje>)
    .sort((a, b) => b.inicioReal - a.inicioReal)
}
