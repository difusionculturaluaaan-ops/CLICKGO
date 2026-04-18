'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { obtenerOrganizacion, listarTodosUsuarios } from '@/shared/lib/firebase/database'
import type { Organization, Usuario } from '@/shared/types'
import { ArrowLeft, Plus, X, UserCheck, ExternalLink, Pencil, Trash2 } from 'lucide-react'

type Modal = 'crear' | 'editar' | 'borrar' | null

export default function OrgDetailPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<Organization | null>(null)
  const [admins, setAdmins] = useState<Usuario[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const [modal, setModal] = useState<Modal>(null)
  const [adminSeleccionado, setAdminSeleccionado] = useState<Usuario | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargandoAccion, setCargandoAccion] = useState(false)
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
    if (autenticado && usuario?.rol === 'superadmin') cargarDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, usuario, orgId])

  function abrirCrear() {
    setNombre(''); setEmail(''); setPassword(''); setError('')
    setModal('crear')
  }

  function abrirEditar(admin: Usuario) {
    setAdminSeleccionado(admin)
    setNombre(admin.nombre || '')
    setEmail('')
    setError('')
    setModal('editar')
  }

  function abrirBorrar(admin: Usuario) {
    setAdminSeleccionado(admin)
    setError('')
    setModal('borrar')
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargandoAccion(true)
    const res = await fetch('/api/superadmin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, orgId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error === 'auth/email-already-exists'
        ? 'Ese email ya tiene cuenta en el sistema.'
        : `Error al crear (${data.error})`)
      setCargandoAccion(false)
      return
    }
    setModal(null)
    setExito(`Admin "${nombre}" creado exitosamente.`)
    setTimeout(() => setExito(''), 4000)
    await cargarDatos()
    setCargandoAccion(false)
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!adminSeleccionado) return
    setError('')
    setCargandoAccion(true)
    const body: Record<string, string> = { nombre }
    if (email.trim()) body.email = email.trim()
    const res = await fetch(`/api/superadmin/usuarios/${adminSeleccionado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(`Error al actualizar (${data.error})`)
      setCargandoAccion(false)
      return
    }
    setModal(null)
    setExito('Administrador actualizado.')
    setTimeout(() => setExito(''), 4000)
    await cargarDatos()
    setCargandoAccion(false)
  }

  async function handleBorrar() {
    if (!adminSeleccionado) return
    setError('')
    setCargandoAccion(true)
    const res = await fetch(`/api/superadmin/usuarios/${adminSeleccionado.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(`Error al eliminar (${data.error})`)
      setCargandoAccion(false)
      return
    }
    setModal(null)
    setExito(`Admin "${adminSeleccionado.nombre}" eliminado.`)
    setTimeout(() => setExito(''), 4000)
    await cargarDatos()
    setCargandoAccion(false)
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
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.replace('/superadmin/dashboard')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white">{org.nombre}</h1>
            <p className="text-gray-500 text-xs">{TIPO_LABEL[org.tipo] ?? org.tipo} · {org.id}</p>
          </div>
          <button onClick={entrarComoOrg} className="flex items-center gap-1.5 text-xs bg-teal-900 text-teal-300 hover:bg-teal-800 px-3 py-1.5 rounded-lg transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Ver panel
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {exito && (
          <div className="bg-teal-900 border border-teal-700 rounded-xl px-4 py-3 text-teal-300 text-sm">{exito}</div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Administradores ({admins.length})</h2>
            <button onClick={abrirCrear} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
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
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEditar(admin)} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => abrirBorrar(admin)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal crear */}
      {modal === 'crear' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Nuevo administrador</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-gray-500 text-xs">El cliente usará este email y contraseña para entrar en <span className="font-mono text-gray-300">/admin</span>.</p>
            <form onSubmit={handleCrear} className="space-y-3">
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus placeholder="Nombre completo"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Contraseña temporal (mín. 6 caracteres)"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" disabled={cargandoAccion || !nombre.trim() || !email.trim() || password.length < 6}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {cargandoAccion ? 'Creando…' : 'Crear administrador'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {modal === 'editar' && adminSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Editar administrador</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEditar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Nuevo email <span className="text-gray-600">(dejar vacío para no cambiar)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nuevo@email.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" disabled={cargandoAccion || !nombre.trim()}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {cargandoAccion ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar borrar */}
      {modal === 'borrar' && adminSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-white font-semibold">Eliminar administrador</h2>
            <p className="text-gray-400 text-sm">
              ¿Confirmas eliminar a <strong className="text-white">{adminSeleccionado.nombre}</strong>? Se borrará su cuenta de Firebase y no podrá iniciar sesión.
            </p>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleBorrar} disabled={cargandoAccion}
                className="flex-1 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {cargandoAccion ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
