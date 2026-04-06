'use client'
import { useEffect, useState } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'

interface EntradaPresencia {
  uid: string
  nombre: string
  paradaId: string
  desde: number
}

export interface PresenciaParada {
  count: number
  nombres: string[]
}

/**
 * Para el admin/operador: devuelve presencia de trabajadores agrupada por paradaId.
 * Se actualiza en tiempo real.
 */
export function usePresenciaEnParadas(orgId: string | null): Record<string, PresenciaParada> {
  const [presencia, setPresencia] = useState<Record<string, PresenciaParada>>({})

  useEffect(() => {
    if (!orgId) return
    const r = ref(db, `presencia/${orgId}`)
    onValue(r, (snap) => {
      if (!snap.exists()) { setPresencia({}); return }
      const data = snap.val() as Record<string, EntradaPresencia>
      const agrupado: Record<string, PresenciaParada> = {}
      for (const entry of Object.values(data)) {
        if (!agrupado[entry.paradaId]) {
          agrupado[entry.paradaId] = { count: 0, nombres: [] }
        }
        agrupado[entry.paradaId].count++
        agrupado[entry.paradaId].nombres.push(entry.nombre.split(' ')[0]) // solo nombre
      }
      setPresencia(agrupado)
    })
    return () => off(r)
  }, [orgId])

  return presencia
}
