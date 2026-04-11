'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRutasActivas } from '@/features/admin/hooks/useRutasActivas'
import { usePresenciaEnParadas } from '@/features/tracking/hooks/usePresenciaEnParadas'
import { TarjetaRuta } from '@/features/admin/components/TarjetaRuta'
import { cerrarSesion } from '@/shared/lib/firebase/auth'

export default function DashboardPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const { rutas, stats, cargando: cargandoRutas } = useRutasActivas(usuario?.orgId ?? null)
  const presencia = usePresenciaEnParadas(usuario?.orgId ?? null)
  const totalConectados = Object.values(presencia).reduce((sum, p) => sum + p.count, 0)
  const [busqueda, setBusqueda] = useState('')
  const [presenciaAbierta, setPresenciaAbierta] = useState(false)

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

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

  const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-teal-700 text-white px-4 pt-4 pb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-bold text-lg leading-tight">ClickGo — Admin</h1>
              <p className="text-teal-200 text-sm">{usuario?.nombre || 'Administrador'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-teal-200 text-sm tabular-nums">{ahora}</span>
              <button onClick={handleLogout} className="text-teal-200 text-sm underline">Salir</button>
            </div>
          </div>

          {/* Acciones rápidas — dentro del header para que queden pegadas arriba */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/admin/mapa')}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors rounded-xl px-3 py-2.5"
            >
              <span className="text-xl">🗺️</span>
              <div className="text-left">
                <p className="text-white font-semibold text-sm leading-tight">Mapa en vivo</p>
                <p className="text-teal-200 text-xs">Tiempo real</p>
              </div>
              <span className="ml-auto text-teal-300 text-sm">→</span>
            </button>
            <button
              onClick={() => router.push('/admin/simulador')}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors rounded-xl px-3 py-2.5"
            >
              <span className="text-xl">🎬</span>
              <div className="text-left">
                <p className="text-white font-semibold text-sm leading-tight">Simulador</p>
                <p className="text-teal-200 text-xs">Demo de ruta</p>
              </div>
              <span className="ml-auto text-teal-300 text-sm">→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal — scrollable */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 space-y-4">

        {/* Stats compactos */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { valor: stats.total,          label: 'Rutas',        color: 'text-gray-800' },
            { valor: stats.activas,        label: 'Activas',      color: 'text-blue-600' },
            { valor: stats.transmitiendo,  label: 'GPS vivo',     color: 'text-green-600' },
            { valor: stats.sinSenal,       label: 'Sin señal',    color: 'text-red-500' },
          ].map(({ valor, label, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className={`text-2xl font-bold ${color}`}>{valor}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Alerta sin señal */}
        {stats.sinSenal > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🚨</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">
                {stats.sinSenal} {stats.sinSenal === 1 ? 'camión sin señal' : 'camiones sin señal'}
              </p>
              <p className="text-red-400 text-xs">Verificar con los operadores</p>
            </div>
          </div>
        )}

        {/* Trabajadores conectados — colapsable */}
        {totalConectados > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setPresenciaAbierta(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span className="text-sm font-medium text-gray-700">
                  {totalConectados} trabajador{totalConectados !== 1 ? 'es' : ''} con app abierta
                </span>
              </div>
              <span className="text-gray-400 text-xs">{presenciaAbierta ? '▲' : '▼'}</span>
            </button>
            {presenciaAbierta && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                {Object.entries(presencia).map(([paradaId, p]) => (
                  <div key={paradaId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 truncate">{p.nombres.join(', ')}</span>
                    <span className="shrink-0 text-teal-600 font-medium ml-2 text-xs">{p.count} en parada</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de rutas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Rutas de hoy</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">En vivo</span>
            </div>
          </div>

          {!cargandoRutas && rutas.length > 0 && (
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="search"
                placeholder="Buscar ruta…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {cargandoRutas ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : rutas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-4xl mb-3">🚌</p>
              <p className="text-gray-700 font-semibold">Sin rutas configuradas</p>
              <p className="text-gray-400 text-sm mt-1">
                Ve a <strong>Rutas</strong> para crear las rutas del servicio
              </p>
            </div>
          ) : (() => {
            const q = busqueda.toLowerCase().trim()
            const filtradas = q ? rutas.filter(r => r.nombre.toLowerCase().includes(q)) : rutas
            return filtradas.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-gray-400 text-sm">Sin rutas para &ldquo;{busqueda}&rdquo;</p>
                <button onClick={() => setBusqueda('')} className="mt-2 text-teal-600 text-sm underline">Limpiar</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtradas.map(ruta => <TarjetaRuta key={ruta.id} ruta={ruta} />)}
              </div>
            )
          })()}
        </div>

        {/* Navegación rápida al resto de secciones */}
        <div className="grid grid-cols-3 gap-2 pb-4">
          {[
            { label: 'Rutas',     icon: '🛣️',  path: '/admin/rutas' },
            { label: 'Usuarios',  icon: '👷',  path: '/admin/usuarios' },
            { label: 'Reportes',  icon: '📊',  path: '/admin/reportes' },
          ].map(({ label, icon, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1 hover:bg-teal-50 active:bg-teal-100 transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-gray-600 font-medium">{label}</span>
            </button>
          ))}
        </div>

      </main>
    </div>
  )
}
