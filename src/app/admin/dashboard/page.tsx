'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRutasActivas } from '@/features/admin/hooks/useRutasActivas'
import { usePresenciaEnParadas } from '@/features/tracking/hooks/usePresenciaEnParadas'
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
  const presencia = usePresenciaEnParadas(autenticado ? ORG_DEMO : null)
  const totalConectados = Object.values(presencia).reduce((sum, p) => sum + p.count, 0)
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

        {/* Presencia de trabajadores */}
        {totalConectados > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700 text-sm">Trabajadores con la app abierta</h2>
              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {totalConectados} 📱
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(presencia).map(([paradaId, p]) => (
                <div key={paradaId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 truncate">{p.nombres.join(', ')}</span>
                  <span className="shrink-0 text-teal-600 font-medium ml-2">{p.count} en parada</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <p className="text-gray-700 font-semibold">Sin rutas configuradas</p>
              <p className="text-gray-400 text-sm mt-1">
                Ve a <strong>Rutas</strong> para crear las rutas del servicio
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

        {/* Acceso rápido al simulador */}
        <button
          onClick={() => router.push('/admin/simulador')}
          className="w-full bg-teal-700 rounded-2xl p-4 shadow-sm text-left hover:bg-teal-600 transition-colors flex items-center gap-4"
        >
          <span className="text-3xl">🎬</span>
          <div>
            <p className="font-semibold text-white">Simulador de ruta</p>
            <p className="text-teal-200 text-xs mt-0.5">Activa un camión en tiempo real para el demo</p>
          </div>
          <span className="ml-auto text-teal-300 text-xl">→</span>
        </button>
      </main>
    </div>
  )
}
