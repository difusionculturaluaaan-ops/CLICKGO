'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRutasActivas } from '@/features/admin/hooks/useRutasActivas'
import { TarjetaRuta } from '@/features/admin/components/TarjetaRuta'
import { cerrarSesion } from '@/shared/lib/firebase/auth'

// Demo: org hardcodeada — en producción viene del perfil del admin
const ORG_DEMO = 'org-demo-001'

function StatCard({
  valor,
  label,
  color,
}: {
  valor: number
  label: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <p className={`text-3xl font-bold ${color}`}>{valor}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const { rutas, stats, cargando: cargandoRutas } = useRutasActivas(
    autenticado ? ORG_DEMO : null
  )

  useEffect(() => {
    if (!cargando && !autenticado) router.replace('/admin')
  }, [autenticado, cargando, router])

  async function handleLogout() {
    await cerrarSesion()
    router.replace('/admin')
  }

  if (cargando || !autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const ahora = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">ClickGo — Admin</h1>
            <p className="text-teal-200 text-sm">{usuario?.nombre || 'Administrador'}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-teal-200 text-sm">{ahora}</p>
            <button onClick={handleLogout} className="text-teal-200 text-sm underline">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard valor={stats.total} label="Total rutas" color="text-gray-800" />
          <StatCard valor={stats.activas} label="Activas" color="text-blue-600" />
          <StatCard valor={stats.transmitiendo} label="Transmitiendo" color="text-green-600" />
          <StatCard valor={stats.sinSenal} label="Sin señal" color="text-red-500" />
        </div>

        {/* Alertas */}
        {stats.sinSenal > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-semibold text-red-700">
                {stats.sinSenal} {stats.sinSenal === 1 ? 'camión sin señal' : 'camiones sin señal'}
              </p>
              <p className="text-red-500 text-sm">Verificar con los operadores</p>
            </div>
          </div>
        )}

        {/* Lista de rutas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Rutas de hoy</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">En vivo</span>
            </div>
          </div>

          {cargandoRutas ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : rutas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-4xl mb-3">🚌</p>
              <p className="text-gray-500 font-medium">No hay rutas configuradas</p>
              <p className="text-gray-400 text-sm mt-1">
                Las rutas aparecerán aquí cuando sean creadas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rutas.map((ruta) => (
                <TarjetaRuta key={ruta.id} ruta={ruta} />
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/admin/rutas')}
            className="bg-white rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">🗺️</span>
            <p className="font-semibold text-gray-800 mt-2">Gestionar rutas</p>
            <p className="text-gray-400 text-xs mt-0.5">Crear y editar rutas</p>
          </button>
          <button
            onClick={() => router.push('/admin/usuarios')}
            className="bg-white rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">👥</span>
            <p className="font-semibold text-gray-800 mt-2">Trabajadores</p>
            <p className="text-gray-400 text-xs mt-0.5">Asignar rutas y paradas</p>
          </button>
          <button
            onClick={() => router.push('/admin/simulador')}
            className="col-span-2 bg-teal-700 rounded-2xl p-4 shadow-sm text-left hover:bg-teal-600 transition-colors"
          >
            <span className="text-2xl">🎬</span>
            <p className="font-semibold text-white mt-2">Simulador de ruta</p>
            <p className="text-teal-200 text-xs mt-0.5">Demo en tiempo real — mueve el camión por las paradas</p>
          </button>
        </div>
      </main>
    </div>
  )
}
