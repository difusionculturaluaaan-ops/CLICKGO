'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerOrganizacion, listarTodosUsuarios, crearOActualizarUsuario } from '@/shared/lib/firebase/database'
import { crearCuentaEmail, cerrarSesion } from '@/shared/lib/firebase/auth'
import type { Organization, Usuario } from '@/shared/types'
import { ArrowLeft, Plus, X, UserCheck, Mail, LogOut, ExternalLink } from 'lucide-react'
import { auth } from '@/shared/lib/firebase/config'

export default function OrgDetailPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<Organization | null>(null)
  const [admins, setAdmins] = useState<Usuario[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    if (!cargando && (!autenticado || usuario?.rol !== 'superadmin')) {
      router.replace('/superadmin')
    }
  }, [autenticado, usuario, cargando, router])

  async function cargarDatos() {
    setCargandoDatos(true)
    const [orgData, todosUsuarios] = await Promise.all([
      obtenerOrganizacion(orgId),
      listarTodosUsuarios(),
    ])
    setOrg(orgData)
    setAdmins(todosUsuarios.filter(u => u.orgId === orgId && u.rol === 'admin'))
    setCargandoDatos(false)
  }

  useEffect(() => {
    if (autenticado && usuario?.rol === 'superadmin') {
      cargarDatos()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, usuario, orgId])

  async function handleCrearAdmin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    setCreando(true)

    const superadminActual = auth.currentUser

    try {
      const nuevoUser = await crearCuentaEmail(email, password)

      await crearOActualizarUsuario(nuevoUser.uid, {
        id: nuevoUser.uid,
        nombre: nombre.trim(),
        telefono: '',
        orgId,
        rol: 'admin',
        creadoEn: Date.now(),
      })

      // Volver a sesión del superadmin
      if (superadminActual?.email) {
        // La sesión de Firebase cambia al crear el nuevo usuario.
        // Cerramos la nueva sesión — el superadmin deberá re-autenticarse.
        await cerrarSesion()
        setExito(`Admin "${nombre}" creado. Deberás iniciar sesión de nuevo como superadmin.`)
        setTimeout(() => router.replace('/admin'), 3000)
      }

      setModalAbierto(false)
      setNombre('')
      setEmail('')
      setPassword('')
      await cargarDatos()
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        setError('Ese email ya tiene cuenta. Asígnalo manualmente desde Firebase Console.')
      } else if (code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.')
      } else {
        setError(`Error al crear la cuenta (${code || 'desconocido'})`)
      }
    } finally {
      setCreando(false)
    }
  }

  function entrarComoOrg() {
    if (!org) return
    sessionStorage.setItem('impersonando_orgId', org.id)
    sessionStorage.setItem('impersonando_orgNombre', org.nombre)
    router.push('/admin/dashboard')
  }

  if (cargando || cargandoDatos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Organización no encontrada.</p>
      </div>
    )
  }

  const TIPO_LABEL: Record<string, string> = {
    maquila: 'Maquiladora', universidad: 'Universidad', empresa: 'Empresa', colegio: 'Colegio',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.replace('/superadmin/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white">{org.nombre}</h1>
            <p className="text-gray-500 text-xs">{TIPO_LABEL[org.tipo] ?? org.tipo} · {org.id}</p>
          </div>
          <button
            onClick={entrarComoOrg}
            className="flex items-center gap-1.5 text-xs bg-teal-900 text-teal-300 hover:bg-teal-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver panel
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {exito && (
          <div className="bg-teal-900 border border-teal-700 rounded-xl px-4 py-3 text-teal-300 text-sm">
            {exito}
          </div>
        )}

        {/* Administradores */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Administradores ({admins.length})</h2>
            <button
              onClick={() => { setModalAbierto(true); setError('') }}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar admin
            </button>
          </div>

          {admins.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
              <UserCheck className="w-7 h-7 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Sin administradores asignados</p>
              <p className="text-gray-600 text-xs mt-1">Crea una cuenta para que el cliente pueda acceder</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-900 flex items-center justify-center text-teal-400 font-bold text-sm shrink-0">
                    {(admin.nombre || 'A')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{admin.nombre || 'Sin nombre'}</p>
                    <p className="text-gray-500 text-xs truncate">{admin.telefono || admin.id}</p>
                  </div>
                  <span className="text-xs text-teal-400 bg-teal-900 px-2 py-0.5 rounded-full">admin</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Modal crear admin */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Nuevo administrador</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-500 text-xs leading-relaxed">
              Se creará una cuenta con email y contraseña. El cliente usará estos datos para entrar en{' '}
              <span className="text-gray-300 font-mono">/admin</span>.
            </p>

            <form onSubmit={handleCrearAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  autoFocus
                  placeholder="Ej. Carlos Martínez"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@empresa.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Contraseña temporal</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mín. 6 caracteres"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <div className="bg-amber-900/40 border border-amber-700/40 rounded-xl px-3 py-2">
                <p className="text-amber-400 text-xs leading-relaxed">
                  Al crear la cuenta, Firebase cerrará tu sesión de superadmin. Tendrás que volver a entrar por <span className="font-mono">/admin</span>.
                </p>
              </div>

              <button
                type="submit"
                disabled={creando || !nombre.trim() || !email.trim() || password.length < 6}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
              >
                {creando ? 'Creando…' : 'Crear administrador'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
