'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarSesionEmail } from '@/shared/lib/firebase/auth'
import { crearOActualizarUsuario, listarTodosUsuarios, obtenerUsuario } from '@/shared/lib/firebase/database'

export default function SuperAdminSetupPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [yaExiste, setYaExiste] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState<'instrucciones' | 'form'>('instrucciones')

  useEffect(() => {
    listarTodosUsuarios().then(usuarios => {
      const existe = usuarios.some(u => u.rol === 'superadmin')
      setYaExiste(existe)
      setVerificando(false)
    })
  }, [])

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await iniciarSesionEmail(email, password)
      const perfilExistente = await obtenerUsuario(user.uid)
      await crearOActualizarUsuario(user.uid, {
        id: user.uid,
        nombre: nombre.trim() || perfilExistente?.nombre || '',
        telefono: perfilExistente?.telefono ?? '',
        orgId: 'system',
        rol: 'superadmin',
        creadoEn: perfilExistente?.creadoEn ?? Date.now(),
      })
      router.replace('/superadmin/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Email o contraseña incorrectos.')
      } else {
        setError('Error al configurar la cuenta. Verifica tus datos.')
      }
      setLoading(false)
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (yaExiste) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-white font-bold text-xl mb-2">Cuenta ya configurada</h1>
          <p className="text-gray-400 text-sm mb-6">
            La cuenta de superadmin ya fue creada. Esta página solo funciona una vez.
          </p>
          <a href="/superadmin" className="text-teal-400 text-sm hover:underline">Ir al login →</a>
        </div>
      </div>
    )
  }

  if (paso === 'instrucciones') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-3xl font-black text-white tracking-tight">ClickGo</p>
            <p className="text-gray-400 text-sm mt-1">Configuración inicial</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-5">
            <h2 className="text-white font-semibold">Antes de continuar</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Necesitas crear primero tu cuenta en la consola de Firebase. Es solo una vez.
            </p>

            <ol className="space-y-4">
              {[
                <>Ve a <span className="text-teal-400 font-mono text-xs">console.firebase.google.com</span></>,
                <>Abre tu proyecto → <strong className="text-white">Authentication</strong> → <strong className="text-white">Users</strong></>,
                <>Clic en <strong className="text-white">Add user</strong>, ingresa tu email y contraseña</>,
                <>Regresa aquí y haz clic en <strong className="text-white">Continuar</strong></>,
              ].map((paso, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-teal-900 text-teal-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setPaso('form')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
            >
              Ya creé mi cuenta — Continuar →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-black text-white tracking-tight">ClickGo</p>
          <p className="text-gray-400 text-sm mt-1">Activar cuenta de superadmin</p>
        </div>

        <form onSubmit={handleSetup} className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Tu nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Tu nombre completo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Email (el que usaste en Firebase)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? 'Configurando…' : 'Activar superadmin'}
          </button>

          <button
            type="button"
            onClick={() => setPaso('instrucciones')}
            className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            ← Volver
          </button>
        </form>
      </div>
    </div>
  )
}
