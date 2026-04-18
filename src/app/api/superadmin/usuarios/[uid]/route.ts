import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { nombre, email } = await req.json()
    const { uid } = await params

    const authUpdate: { displayName?: string; email?: string } = {}
    if (nombre) authUpdate.displayName = nombre.trim()
    if (email) authUpdate.email = email.trim()
    if (Object.keys(authUpdate).length) await adminAuth.updateUser(uid, authUpdate)

    const dbUpdate: Record<string, string> = {}
    if (nombre) dbUpdate.nombre = nombre.trim()
    await adminDb.ref(`usuarios/${uid}`).update(dbUpdate)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? 'unknown'
    return NextResponse.json({ error: code }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params
    await adminAuth.deleteUser(uid)
    await adminDb.ref(`usuarios/${uid}`).remove()
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? 'unknown'
    return NextResponse.json({ error: code }, { status: 500 })
  }
}
