'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ref, set, remove } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'

const DURACION_MS = 25 * 60 * 1000 // 25 minutos

interface EsperandoSignalOptions {
  orgId: string | null
  paradaId: string | null
  uid: string | null
  nombre: string
  /** Auto-cancela cuando cambia a true (bus llegando) */
  busLlegando: boolean
}

export function useEsperandoSignal({ orgId, paradaId, uid, nombre, busLlegando }: EsperandoSignalOptions) {
  const [esperando, setEsperando] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const paradaPath = orgId && paradaId && uid
    ? `esperando/${orgId}/${paradaId}/${uid}`
    : null

  const cancelar = useCallback(async () => {
    if (!paradaPath) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    await remove(ref(db, paradaPath))
    setEsperando(false)
  }, [paradaPath])

  const activar = useCallback(async () => {
    if (!paradaPath) return
    const expiraEn = Date.now() + DURACION_MS
    await set(ref(db, paradaPath), {
      uid,
      nombre,
      paradaId,
      timestamp: Date.now(),
      expiraEn,
    })
    setEsperando(true)
    // Auto-cancelar después de 25 min
    timerRef.current = setTimeout(() => cancelar(), DURACION_MS)
  }, [paradaPath, uid, nombre, paradaId, cancelar])

  // Auto-cancelar cuando el bus llega
  useEffect(() => {
    if (busLlegando && esperando) cancelar()
  }, [busLlegando, esperando, cancelar])

  // Limpiar al desmontar
  useEffect(() => () => { cancelar() }, [cancelar])

  return { esperando, activar, cancelar }
}
