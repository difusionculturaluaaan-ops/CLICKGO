'use client'
import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import { escucharSesion } from '@/shared/lib/firebase/auth'
import { obtenerUsuario } from '@/shared/lib/firebase/database'
import type { Usuario } from '@/shared/types'

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = escucharSesion(async (user) => {
      setFirebaseUser(user)
      if (user) {
        const perfil = await obtenerUsuario(user.uid)
        setUsuario(perfil)
      } else {
        setUsuario(null)
      }
      setCargando(false)
    })
    return unsub
  }, [])

  return { firebaseUser, usuario, cargando, autenticado: !!firebaseUser }
}
