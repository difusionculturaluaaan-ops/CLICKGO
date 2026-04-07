'use client'
import { useState } from 'react'
import { solicitarPermisoYObtenerToken } from '@/shared/lib/firebase/messaging'
import { crearOActualizarUsuario } from '@/shared/lib/firebase/database'

export function useFCMToken(userId: string | null) {
  const [token, setToken] = useState<string | null>(null)
  const [permiso, setPermiso] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' ? Notification.permission : 'default'
  )

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
