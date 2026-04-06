'use client'
import { useEffect } from 'react'
import { ref, set, onDisconnect, remove } from 'firebase/database'
import { db } from '@/shared/lib/firebase/config'

/**
 * Registra la presencia del trabajador en Firebase mientras tiene la app abierta.
 * onDisconnect() borra el nodo automáticamente al cerrar/desconectarse.
 * Nodo: /presencia/{orgId}/{uid}
 */
export function usePresenciaWorker(
  orgId: string | null,
  uid: string | null,
  nombre: string,
  paradaId: string | null,
) {
  useEffect(() => {
    if (!orgId || !uid || !paradaId) return

    const presenciaRef = ref(db, `presencia/${orgId}/${uid}`)

    // Al desconectarse (cerrar app, perder señal), Firebase borra el nodo
    onDisconnect(presenciaRef).remove()

    // Registrar presencia
    set(presenciaRef, {
      uid,
      nombre,
      paradaId,
      desde: Date.now(),
    })

    return () => {
      // Limpiar al desmontar (navegar fuera de la pantalla)
      remove(presenciaRef)
    }
  }, [orgId, uid, nombre, paradaId])
}
