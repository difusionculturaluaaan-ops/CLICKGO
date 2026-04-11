'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerHistorial, obtenerTrail, obtenerRuta } from '@/shared/lib/firebase/database'
import type { RegistroViaje, PuntoTrail } from '@/shared/lib/firebase/database'
import type { Parada } from '@/shared/types'

const TrailMapInner = nextDynamic(
  () => import('./TrailMapInner').then(m => m.TrailMapInner),
  { ssr: false, loading: () => <div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">Cargando mapa…</div> }
)

interface TrailData {
  trail: PuntoTrail[]
  paradas: Parada[]
}

function BadgePuntualidad({ valor }: { valor: number }) {
  const color = valor >= 80 ? 'bg-green-100 text-green-700' : valor >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  const icono = valor >= 80 ? '✅' : valor >= 60 ? '⚠️' : '❌'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {icono} {valor}%
    </span>
  )
}

function formatHora(ts: number) {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ReportesPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const orgId = usuario?.orgId ?? ''
  const [viajes, setViajes] = useState<RegistroViaje[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [viajeAbierto, setViajeAbierto] = useState<string | null>(null)
  const [trailData, setTrailData] = useState<Record<string, TrailData | 'loading' | 'empty'>>({})
  const [busqueda, setBusqueda] = useState('')

  const verRecorrido = useCallback(async (viaje: RegistroViaje) => {
    if (trailData[viaje.id]) return
    setTrailData(prev => ({ ...prev, [viaje.id]: 'loading' }))
    const [trail, ruta] = await Promise.all([
      obtenerTrail(orgId, viaje.fecha, viaje.rutaId),
      obtenerRuta(viaje.rutaId),
    ])
    if (trail.length === 0 || !ruta) {
      setTrailData(prev => ({ ...prev, [viaje.id]: 'empty' }))
      return
    }
    const paradas = [...ruta.paradas].sort((a, b) => a.orden - b.orden)
    setTrailData(prev => ({ ...prev, [viaje.id]: { trail, paradas } }))
  }, [trailData])

  useEffect(() => {
    if (!cargando && (!autenticado || (usuario && usuario.rol !== 'admin' && usuario.rol !== 'superadmin'))) {
      router.replace('/admin')
    }
  }, [autenticado, usuario, cargando, router])

  useEffect(() => {
    if (!orgId) return
    obtenerHistorial(orgId).then(data => {
      setViajes(data)
      setCargandoDatos(false)
    })
  }, [orgId])

  if (cargando || !autenticado) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  // ── Estadísticas globales ──────────────────────────────────────────────────
  const totalViajes = viajes.length
  const puntualidadPromedio = totalViajes > 0
    ? Math.round(viajes.reduce((s, v) => s + v.puntualidad, 0) / totalViajes)
    : 0

  const paradasTotales = viajes.reduce((s, v) => s + v.paradas.length, 0)
  const paradasATiempo = viajes.reduce((s, v) => s + v.paradas.filter(p => p.minutosRetraso <= 3).length, 0)

  const retrasoPromedio = paradasTotales > 0
    ? (viajes.reduce((s, v) => s + v.paradas.reduce((sp, p) => sp + p.minutosRetraso, 0), 0) / paradasTotales).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/admin/dashboard')} className="text-teal-200">←</button>
        <div>
          <h1 className="font-bold">Reportes de Puntualidad</h1>
          <p className="text-teal-200 text-xs">{totalViajes} viajes registrados</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* KPIs globales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-3xl font-bold ${puntualidadPromedio >= 80 ? 'text-green-600' : puntualidadPromedio >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
              {puntualidadPromedio}%
            </p>
            <p className="text-gray-500 text-xs mt-1">Puntualidad</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-800">{paradasATiempo}<span className="text-lg text-gray-400">/{paradasTotales}</span></p>
            <p className="text-gray-500 text-xs mt-1">Paradas a tiempo</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-3xl font-bold ${Number(retrasoPromedio) <= 3 ? 'text-green-600' : 'text-yellow-600'}`}>
              {retrasoPromedio}<span className="text-lg text-gray-400">min</span>
            </p>
            <p className="text-gray-500 text-xs mt-1">Retraso prom.</p>
          </div>
        </div>

        {/* Barra visual de puntualidad */}
        {totalViajes > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Paradas a tiempo vs con retraso</p>
              <span className="text-xs text-gray-400">{paradasTotales} totales</span>
            </div>
            <div className="w-full h-4 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${paradasTotales > 0 ? (paradasATiempo / paradasTotales) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>🟢 A tiempo ({paradasATiempo})</span>
              <span>🔴 Con retraso ({paradasTotales - paradasATiempo})</span>
            </div>
          </div>
        )}

        {/* Lista de viajes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Historial de viajes</h2>
            {!cargandoDatos && viajes.length > 0 && (
              <span className="text-xs text-gray-400">{viajes.length} viajes</span>
            )}
          </div>

          {!cargandoDatos && viajes.length > 0 && (
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="search"
                placeholder="Buscar por ruta o fecha…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {cargandoDatos ? (
            [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse mb-3" />)
          ) : viajes.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-600 font-medium">Sin datos aún</p>
              <p className="text-gray-400 text-sm mt-1">
                Completa una simulación en el{' '}
                <button onClick={() => router.push('/admin/simulador')} className="text-teal-600 underline">
                  Simulador de ruta
                </button>{' '}
                para generar el primer reporte
              </p>
            </div>
          ) : (() => {
            const q = busqueda.toLowerCase().trim()
            const viajesFiltrados = q
              ? viajes.filter(v =>
                  v.nombreRuta.toLowerCase().includes(q) ||
                  v.fecha.includes(q) ||
                  formatFecha(v.fecha).toLowerCase().includes(q)
                )
              : viajes
            if (viajesFiltrados.length === 0) return (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-gray-500 text-sm">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
                <button onClick={() => setBusqueda('')} className="mt-2 text-teal-600 text-sm underline">Limpiar búsqueda</button>
              </div>
            )
            return (
            <div className="space-y-3">
              {viajesFiltrados.map(viaje => {
                const abierto = viajeAbierto === viaje.id
                const duracionMin = Math.round((viaje.finReal - viaje.inicioReal) / 60000)
                return (
                  <div key={viaje.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Cabecera del viaje */}
                    <button
                      onClick={() => setViajeAbierto(abierto ? null : viaje.id)}
                      className="w-full px-4 py-4 flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{viaje.nombreRuta}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatFecha(viaje.fecha)} · {formatHora(viaje.inicioReal)} → {formatHora(viaje.finReal)} ({duracionMin} min)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgePuntualidad valor={viaje.puntualidad} />
                        <span className="text-gray-400 text-sm">{abierto ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Detalle de paradas */}
                    {abierto && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-3">

                        {/* Resumen inicio / llegada */}
                        {(() => {
                          const paradaInicio = viaje.paradas[0]
                          const paradaFin = viaje.paradas[viaje.paradas.length - 1]
                          const retrasoInicio = paradaInicio
                            ? Math.round((viaje.inicioReal - (() => { const [h,m] = paradaInicio.horaEstimada.split(':').map(Number); const base = new Date(viaje.inicioReal); base.setHours(h,m,0,0); return base.getTime() })()) / 60000)
                            : null
                          const retrasoFin = paradaFin
                            ? Math.round((viaje.finReal - (() => { const [h,m] = paradaFin.horaEstimada.split(':').map(Number); const base = new Date(viaje.finReal); base.setHours(h,m,0,0); return base.getTime() })()) / 60000)
                            : null
                          const colorInicio = retrasoInicio === null ? 'text-gray-500' : retrasoInicio <= 3 ? 'text-green-600' : 'text-red-500'
                          const colorFin = retrasoFin === null ? 'text-gray-500' : retrasoFin <= 3 ? 'text-green-600' : 'text-red-500'
                          return (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Inicio de ruta</p>
                                <p className={`text-lg font-bold ${colorInicio}`}>{formatHora(viaje.inicioReal)}</p>
                                {paradaInicio && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Prog. {paradaInicio.horaEstimada}
                                    {retrasoInicio !== null && retrasoInicio !== 0 && (
                                      <span className={`ml-1 font-medium ${colorInicio}`}>
                                        {retrasoInicio > 0 ? `+${retrasoInicio}min` : `${retrasoInicio}min`}
                                      </span>
                                    )}
                                  </p>
                                )}
                                <p className="text-xs text-gray-300 mt-0.5 truncate">{paradaInicio?.nombre ?? '—'}</p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Llegada a destino</p>
                                <p className={`text-lg font-bold ${colorFin}`}>{formatHora(viaje.finReal)}</p>
                                {paradaFin && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Prog. {paradaFin.horaEstimada}
                                    {retrasoFin !== null && retrasoFin !== 0 && (
                                      <span className={`ml-1 font-medium ${colorFin}`}>
                                        {retrasoFin > 0 ? `+${retrasoFin}min` : `${retrasoFin}min`}
                                      </span>
                                    )}
                                  </p>
                                )}
                                <p className="text-xs text-gray-300 mt-0.5 truncate">{paradaFin?.nombre ?? '—'}</p>
                              </div>
                            </div>
                          )
                        })()}

                        <div className="space-y-2">
                          {/* Encabezado tabla */}
                          <div className="grid grid-cols-4 text-xs text-gray-400 font-medium pb-1 border-b border-gray-100">
                            <span className="col-span-2">Parada</span>
                            <span className="text-center">Estimado</span>
                            <span className="text-center">Real</span>
                          </div>
                          {viaje.paradas.map(p => {
                            const retraso = p.minutosRetraso
                            const color = retraso <= 0 ? 'text-green-600' : retraso <= 3 ? 'text-yellow-600' : 'text-red-500'
                            return (
                              <div key={p.paradaId} className="grid grid-cols-4 text-sm items-center">
                                <span className="col-span-2 text-gray-700 truncate">{p.nombre}</span>
                                <span className="text-center text-gray-400">{p.horaEstimada}</span>
                                <div className="text-center">
                                  <span className={`font-medium ${color}`}>{p.horaReal}</span>
                                  {retraso !== 0 && (
                                    <span className={`block text-xs ${color}`}>
                                      {retraso > 0 ? `+${retraso}min` : `${retraso}min`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Botón y mapa de recorrido real */}
                        {(() => {
                          const td = trailData[viaje.id]
                          if (!td) {
                            return (
                              <button
                                onClick={() => verRecorrido(viaje)}
                                className="w-full py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                              >
                                🗺️ Ver recorrido real
                              </button>
                            )
                          }
                          if (td === 'loading') {
                            return (
                              <div className="h-[320px] flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )
                          }
                          if (td === 'empty') {
                            return (
                              <div className="py-3 text-center text-sm text-gray-400">
                                Sin datos GPS para este viaje
                              </div>
                            )
                          }
                          return <TrailMapInner trail={td.trail} paradas={td.paradas} />
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}
