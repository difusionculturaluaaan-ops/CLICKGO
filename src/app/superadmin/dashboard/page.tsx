'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { listarOrganizaciones, listarTodosUsuarios, obtenerRutasPorOrg } from '@/shared/lib/firebase/database'
import { cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Organization, Usuario, Ruta } from '@/shared/types'
import { Building2, Users, Route, Calendar, LogOut, RefreshCw, Copy, Check } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  maquila: 'Maquiladora',
  universidad: 'Universidad',
  empresa: 'Empresa',
  colegio: 'Colegio',
}

const TIPO_COLOR: Record<string, string> = {
  maquila: 'bg-teal-900 text-teal-300',
  universidad: 'bg-blue-900 text-blue-300',
  empresa: 'bg-purple-900 text-purple-300',
  colegio: 'bg-orange-900 text-orange-300',
}

interface OrgStats {
  org: Organization
  usuarios: number
  rutas: number
  rutasActivas: number
}

export default function SuperAdminDashboardPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<OrgStats[]>([])
  const [cargandoStats, setCargandoStats] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    if (!cargando && (!autenticado || usuario?.rol !== 'superadmin')) {
      router.replace('/superadmin')
    }
  }, [autenticado, usuario, cargando, router])

  async function cargarStats() {
    setCargandoStats(true)
    const [orgs, todosUsuarios] = await Promise.all([
      listarOrganizaciones(),
      listarTodosUsuarios(),
    ])

    const statsPromises = orgs.map(async (org) => {
      const rutas: Ruta[] = await obtenerRutasPorOrg(org.id)
      const usuarios = todosUsuarios.filter(
        (u: Usuario) => u.orgId === org.id && u.rol !== 'superadmin'
      ).length
      const rutasActivas = rutas.filter(r => r.estado === 'activa').length
      return { org, usuarios, rutas: rutas.length, rutasActivas }
    })

    const resultado = await Promise.all(statsPromises)
    resultado.sort((a, b) => (b.org.creadoEn ?? 0) - (a.org.creadoEn ?? 0))
    setStats(resultado)
    setCargandoStats(false)
  }

  useEffect(() => {
    if (autenticado && usuario?.rol === 'superadmin') {
      cargarStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, usuario])

  async function handleLogout() {
    await cerrarSesion()
    router.replace('/superadmin')
  }

  function copiarId(id: string) {
    navigator.clipboard.writeText(id)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 1500)
  }

  if (cargando || !autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalOrgs = stats.length
  const totalUsuarios = stats.reduce((s, r) => s + r.usuarios, 0)
  const totalRutas = stats.reduce((s, r) => s + r.rutas, 0)
  const totalActivas = stats.reduce((s, r) => s + r.rutasActivas, 0)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-black text-white text-lg tracking-tight">ClickGo</p>
            <p className="text-gray-500 text-xs">Superadmin · {usuario?.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cargarStats}
              disabled={cargandoStats}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${cargandoStats ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-8">

        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icono: Building2, valor: totalOrgs,    label: 'Clientes',       color: 'text-teal-400' },
            { icono: Users,     valor: totalUsuarios, label: 'Usuarios total', color: 'text-blue-400' },
            { icono: Route,     valor: totalRutas,    label: 'Rutas totales',  color: 'text-purple-400' },
            { icono: Route,     valor: totalActivas,  label: 'Activas ahora',  color: 'text-green-400' },
          ].map(({ icono: Icono, valor, label, color }) => (
            <div key={label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <Icono className={`w-4 h-4 ${color} mb-2`} />
              <p className={`text-2xl font-black ${color}`}>{valor}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Lista de organizaciones */}
        <div>
          <h2 className="text-white font-semibold mb-4">
            Organizaciones ({totalOrgs})
          </h2>

          {cargandoStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-10 text-center border border-gray-800">
              <Building2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Sin organizaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.map(({ org, usuarios, rutas, rutasActivas }) => (
                <div key={org.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold truncate">{org.nombre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLOR[org.tipo] ?? 'bg-gray-800 text-gray-400'}`}>
                          {TIPO_LABEL[org.tipo] ?? org.tipo}
                        </span>
                        {rutasActivas > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-400 shrink-0">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            En vivo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {usuarios} usuarios
                        </span>
                        <span className="flex items-center gap-1">
                          <Route className="w-3 h-3" />
                          {rutas} rutas
                        </span>
                        {org.creadoEn && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(org.creadoEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => copiarId(org.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0 mt-1"
                      title="Copiar orgId"
                    >
                      {copiado === org.id
                        ? <><Check className="w-3 h-3 text-teal-400" /><span className="text-teal-400">Copiado</span></>
                        : <><Copy className="w-3 h-3" /><span className="font-mono truncate max-w-[120px]">{org.id}</span></>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
