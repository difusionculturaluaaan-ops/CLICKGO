'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { PhoneLoginForm } from '@/features/auth/components/PhoneLoginForm'

export default function AdminPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && autenticado) {
      if (usuario?.rol === 'admin' || usuario?.rol === 'superadmin') {
        router.replace('/admin/dashboard')
      } else if (usuario) {
        // Usuario sin rol admin — acceso denegado
        router.replace('/')
      }
    }
  }, [autenticado, usuario, cargando, router])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (autenticado) return null

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
        <PhoneLoginForm />
      </div>
    </div>
  )
}
