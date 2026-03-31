import { ref, set, update, remove, push, get } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import type { Ruta, Parada } from '@/shared/types'

export async function crearRuta(orgId: string, datos: Omit<Ruta, 'id' | 'creadoEn'>): Promise<string> {
  const nuevaRef = push(ref(db, 'rutas'))
  const id = nuevaRef.key!
  await set(nuevaRef, { ...datos, id, orgId, creadoEn: Date.now() })
  return id
}

export async function actualizarRuta(rutaId: string, datos: Partial<Ruta>): Promise<void> {
  await update(ref(db, `rutas/${rutaId}`), datos)
}

export async function eliminarRuta(rutaId: string): Promise<void> {
  await remove(ref(db, `rutas/${rutaId}`))
  await remove(ref(db, `ubicaciones/${rutaId}`))
}

export async function agregarParada(rutaId: string, paradas: Parada[]): Promise<void> {
  await update(ref(db, `rutas/${rutaId}`), { paradas })
}

export async function obtenerRutas(orgId: string): Promise<Ruta[]> {
  const snap = await get(ref(db, 'rutas'))
  if (!snap.exists()) return []
  return Object.entries(snap.val() as Record<string, Ruta>)
    .filter(([, r]) => r.orgId === orgId)
    .map(([id, r]) => ({ ...r, id }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}
