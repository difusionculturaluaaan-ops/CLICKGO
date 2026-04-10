'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRutasActivas } from '@/features/admin/hooks/useRutasActivas'

const ORG_DEMO = 'org-demo-001'

// Centro default: Saltillo
const DEFAULT_LAT = 25.4232
const DEFAULT_LNG = -100.9963

const MapaAdmin = nextDynamic(() => import('./MapaAdminInner').then(m => m.MapaAdminInner), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function AdminMapaPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const { rutas, stats } = useRutasActivas(autenticado ? ORG_DEMO : null)

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

  if (cargando || !autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Header compacto */}
      <div className="bg-gray-900/95 backdrop-blur px-4 py-2 flex items-center justify-between shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-white font-bold text-sm">Mapa en vivo</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-400">{stats.total} rutas</span>
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {stats.transmitiendo} activas
          </span>
          {stats.sinSenal > 0 && (
            <span className="text-red-400">{stats.sinSenal} sin señal</span>
          )}
        </div>
      </div>

      {/* Mapa pantalla completa */}
      <div className="flex-1 relative">
        <MapaAdmin rutas={rutas} defaultLat={DEFAULT_LAT} defaultLng={DEFAULT_LNG} />
      </div>
    </div>
  )
}
