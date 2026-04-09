'use client'
import { useState } from 'react'
import { iniciarSesionEmail } from '@/shared/lib/firebase/auth'

export function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesionEmail(email, password)
      // El redirect lo maneja el padre via useAuth
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Correo o contraseña incorrectos.')
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.')
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.')
      }
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div>
        <label className="block text-sm font-medium text-teal-900 mb-1">
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@clickgo.mx"
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base text-gray-900 placeholder:text-gray-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-teal-900 mb-1">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base text-gray-900 placeholder:text-gray-400"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={cargando}
        className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
      >
        {cargando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
