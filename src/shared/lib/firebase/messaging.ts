'use client'
// firebase/messaging se importa de forma lazy para evitar errores en iOS Safari
// donde el módulo intenta acceder a APIs del navegador al momento de carga

export async function solicitarPermisoYObtenerToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return null

  try {
    const [{ getMessaging, getToken }, { default: app }] = await Promise.all([
      import('firebase/messaging'),
      import('./config'),
    ])
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

export function escucharNotificacionesForeground(
  callback: (titulo: string, cuerpo: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  let unsub: (() => void) | null = null
  Promise.all([
    import('firebase/messaging'),
    import('./config'),
  ]).then(([{ getMessaging, onMessage }, { default: app }]) => {
    try {
      const messaging = getMessaging(app)
      unsub = onMessage(messaging, (payload) => {
        const titulo = payload.notification?.title ?? 'ClickGo'
        const cuerpo = payload.notification?.body ?? ''
        callback(titulo, cuerpo)
      })
    } catch { /* FCM no disponible */ }
  }).catch(() => {})
  return () => { unsub?.() }
}

export function mostrarNotificacionLocal(titulo: string, cuerpo: string): void {
  if (typeof window === 'undefined') return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(titulo, { body: cuerpo, icon: '/icon-192.png' })
}
