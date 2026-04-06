'use client'
import { useEffect, useState } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'

interface EsperandoEntry {
  uid: string
  nombre: string
  paradaId: string
  timestamp: number
  expiraEn: number
}

/** Devuelve un mapa { paradaId → count } para una org */
export function useEsperandoEnParadas(orgId: string | null): Record<string, number> {
  const [conteos, setConteos] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!orgId) return
    const r = ref(db, `esperando/${orgId}`)
    onValue(r, (snap) => {
      if (!snap.exists()) { setConteos({}); return }
      const ahora = Date.now()
      const data = snap.val() as Record<string, Record<string, EsperandoEntry>>
      const result: Record<string, number> = {}
      for (const [paradaId, entries] of Object.entries(data)) {
        // Filtrar entradas expiradas
        const activos = Object.values(entries).filter((e) => e.expiraEn > ahora)
        if (activos.length > 0) result[paradaId] = activos.length
      }
      setConteos(result)
    })
    return () => off(r)
  }, [orgId])

  return conteos
}
