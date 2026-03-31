// Service Worker para Firebase Cloud Messaging
// Este archivo DEBE estar en /public para que Firebase lo encuentre en la raíz

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBx3OUfLesle5bfOfHWuzn0OFjnJNePjFA',
  authDomain: 'sigo-55fff.firebaseapp.com',
  databaseURL: 'https://sigo-55fff-default-rtdb.firebaseio.com',
  projectId: 'sigo-55fff',
  storageBucket: 'sigo-55fff.firebasestorage.app',
  messagingSenderId: '467625022689',
  appId: '1:467625022689:web:933f0bc04e0b4bb8f2d3a0',
})

const messaging = firebase.messaging()

// Maneja notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title ?? 'ClickGo'
  const cuerpo = payload.notification?.body ?? ''

  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'clickgo-camion',      // reemplaza notificación anterior (no acumula)
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/trabajador/mapa' },
  })
})

// Click en notificación → abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/trabajador') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/trabajador/mapa')
    })
  )
})
