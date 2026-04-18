'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminLoginForm } from '@/features/auth/components/AdminLoginForm'
import { cerrarSesion } from '@/shared/lib/firebase/auth'

export default function AdminPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && autenticado) {
      if (usuario?.rol === 'superadmin') {
        router.replace('/superadmin/dashboard')
      } else if (usuario?.rol === 'admin') {
        router.replace('/admin/dashboard')
      }
      // Si no es admin, se muestra la pantalla de "sin acceso" abajo
    }
  }, [autenticado, usuario, cargando, router])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Autenticado pero sin rol admin — pedir que cierre sesión
  if (autenticado && usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-700 mb-2">Sesión activa como <strong>{usuario.nombre || usuario.telefono}</strong></p>
          <p className="text-gray-500 text-sm mb-2">Esta cuenta no tiene acceso al panel admin.</p>
          <p className="text-xs text-gray-400 mb-6">Cierra sesión e ingresa con una cuenta admin.</p>
          <button
            onClick={async () => {
              await cerrarSesion()
              window.location.href = '/admin'
            }}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 transition-colors"
          >
            Cerrar sesión y cambiar cuenta
          </button>
        </div>
      </div>
    )
  }

  // Autenticado pero perfil aún cargando (usuario null momentáneo)
  if (autenticado && !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-teal-700 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
          <p className="text-gray-500 text-sm mt-1">ClickGo — Gestión de flota</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}
