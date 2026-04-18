import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMessaging } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { rutaId, paradaId, orgId, mensaje } = await req.json()
    if (!rutaId || !paradaId || !orgId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Trabajadores esperando en esta parada
    const esperandoSnap = await adminDb.ref(`esperando/${orgId}/${paradaId}`).get()
    if (!esperandoSnap.exists()) {
      return NextResponse.json({ enviados: 0 })
    }

    const uids = Object.keys(esperandoSnap.val() as Record<string, unknown>)

    // Obtener FCM tokens de cada trabajador
    const tokens: string[] = []
    await Promise.all(uids.map(async (uid) => {
      const snap = await adminDb.ref(`usuarios/${uid}/fcmToken`).get()
      if (snap.exists()) tokens.push(snap.val() as string)
    }))

    if (tokens.length === 0) {
      return NextResponse.json({ enviados: 0 })
    }

    const titulo = '⚡ ¡Ya viene tu camión!'
    const cuerpo = mensaje ?? 'Llegará en aproximadamente 5 minutos. Prepárate.'

    // Enviar en lotes de 500 (límite de FCM)
    let enviados = 0
    for (let i = 0; i < tokens.length; i += 500) {
      const lote = tokens.slice(i, i + 500)
      const response = await adminMessaging.sendEachForMulticast({
        tokens: lote,
        notification: { title: titulo, body: cuerpo },
        webpush: {
          notification: {
            title: titulo,
            body: cuerpo,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `camion-${rutaId}-${paradaId}`,
            renotify: true,
            vibrate: [200, 100, 200],
          },
          fcmOptions: { link: '/trabajador/mapa' },
        },
      })
      enviados += response.successCount
    }

    return NextResponse.json({ enviados })
  } catch (err) {
    console.error('Error enviando notificaciones:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
