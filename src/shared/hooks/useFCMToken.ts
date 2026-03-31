'use client'
import { useState, useEffect } from 'react'
import { solicitarPermisoYObtenerToken } from '@/shared/lib/firebase/messaging'
import { crearOActualizarUsuario } from '@/shared/lib/firebase/database'

export function useFCMToken(userId: string | null) {
  const [token, setToken] = useState<string | null>(null)
  const [permiso, setPermiso] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPermiso(Notification.permission)
  }, [])

  async function solicitarPermiso() {
    const t = await solicitarPermisoYObtenerToken()
    if (t) {
      setToken(t)
      setPermiso('granted')
      // Guardar token en perfil del usuario para enviar push desde servidor
      if (userId) {
        await crearOActualizarUsuario(userId, { fcmToken: t })
      }
    } else {
      setPermiso(Notification.permission)
    }
    return t
  }

  return { token, permiso, solicitarPermiso }
}
