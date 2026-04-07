'use client'
import { useState, useEffect } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'
import type { Ruta, Ubicacion } from '@/shared/types'

export interface RutaConUbicacion extends Ruta {
  ubicacion: Ubicacion | null
  minutesSinSenal: number | null
}

export function useRutasActivas(orgId: string | null) {
  const [rutas, setRutas] = useState<RutaConUbicacion[]>([])
  const [cargando, setCargando] = useState(!!orgId)

  useEffect(() => {
    if (!orgId) return

    const rutasRef = ref(db, 'rutas')
    const ubicacionesRef = ref(db, 'ubicaciones')

    let rutasData: Record<string, Ruta> = {}
    let ubicacionesData: Record<string, Ubicacion> = {}

    function combinar() {
      const resultado: RutaConUbicacion[] = Object.entries(rutasData)
        .filter(([, r]) => r.orgId === orgId)
        .map(([id, ruta]) => {
          const ubicacion = ubicacionesData[id] ?? null
          const minutesSinSenal = ubicacion
            ? Math.floor((Date.now() - ubicacion.timestamp) / 60000)
            : null
          return { ...ruta, id, ubicacion, minutesSinSenal }
        })
        .sort((a, b) => {
          // Activas primero
          if (a.estado === 'activa' && b.estado !== 'activa') return -1
          if (b.estado === 'activa' && a.estado !== 'activa') return 1
          return a.nombre.localeCompare(b.nombre)
        })
      setRutas(resultado)
      setCargando(false)
    }

    onValue(rutasRef, (snap) => {
      rutasData = snap.exists() ? snap.val() : {}
      combinar()
    })

    onValue(ubicacionesRef, (snap) => {
      ubicacionesData = snap.exists() ? snap.val() : {}
      combinar()
    })

    return () => {
      off(rutasRef)
      off(ubicacionesRef)
    }
  }, [orgId])

  const stats = {
    total: rutas.length,
    activas: rutas.filter((r) => r.estado === 'activa').length,
    transmitiendo: rutas.filter((r) => r.ubicacion?.active).length,
    sinSenal: rutas.filter(
      (r) => r.estado === 'activa' && (!r.ubicacion?.active || (r.minutesSinSenal ?? 0) > 3)
    ).length,
  }

  return { rutas, stats, cargando }
}
