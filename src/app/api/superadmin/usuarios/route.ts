import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, password, orgId } = await req.json()

    if (!nombre || !email || !password || !orgId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName: nombre })

    await adminDb.ref(`usuarios/${userRecord.uid}`).set({
      id: userRecord.uid,
      nombre: nombre.trim(),
      telefono: '',
      orgId,
      rol: 'admin',
      creadoEn: Date.now(),
    })

    return NextResponse.json({ uid: userRecord.uid })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? 'unknown'
    const status = code === 'auth/email-already-exists' ? 409 : 500
    return NextResponse.json({ error: code }, { status })
  }
}
