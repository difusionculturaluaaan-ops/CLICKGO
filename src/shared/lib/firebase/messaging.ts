'use client'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import app from './config'

export async function solicitarPermisoYObtenerToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return null

  try {
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (err) {
    console.warn('FCM token error:', err)
    return null
  }
}

/**
 * Escucha notificaciones cuando la app está en primer plano
 * (en segundo plano las maneja el service worker)
 */
export function escucharNotificacionesForeground(
  callback: (titulo: string, cuerpo: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  try {
    const messaging = getMessaging(app)
    return onMessage(messaging, (payload) => {
      const titulo = payload.notification?.title ?? 'ClickGo'
      const cuerpo = payload.notification?.body ?? ''
      callback(titulo, cuerpo)
    })
  } catch {
    return () => {}
  }
}

/**
 * Muestra notificación local (sin servidor) — útil para el demo
 * cuando la app ya está abierta
 */
export function mostrarNotificacionLocal(titulo: string, cuerpo: string): void {
  if (typeof window === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(titulo, { body: cuerpo, icon: '/icon-192.png' })
}
