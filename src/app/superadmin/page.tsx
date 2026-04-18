'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { enviarCodigoSMS, confirmarCodigo, limpiarRecaptcha } from '@/shared/lib/firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'

export default function SuperAdminLoginPage() {
  const { autenticado, usuario, cargando } = useAuth()
  const router = useRouter()
  const [telefono, setTelefono] = useState('')
  const [codigo, setCodigo] = useState('')
  const [paso, setPaso] = useState<'telefono' | 'codigo'>('telefono')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cargando && autenticado && usuario?.rol === 'superadmin') {
      router.replace('/superadmin/dashboard')
    }
  }, [autenticado, usuario, cargando, router])

  useEffect(() => {
    if (autenticado && usuario && usuario.rol !== 'superadmin') {
      setError('Este número no tiene acceso de superadmin.')
      setLoading(false)
    }
  }, [autenticado, usuario])

  useEffect(() => {
    return () => { limpiarRecaptcha() }
  }, [])

  async function handleEnviarSMS(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const numero = telefono.startsWith('+') ? telefono : `+52${telefono}`
      const result = await enviarCodigoSMS(numero)
      setConfirmationResult(result)
      setPaso('codigo')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.')
      } else if (code === 'auth/invalid-phone-number') {
        setError('Número inválido. Usa formato +52XXXXXXXXXX.')
      } else {
        setError(`Error al enviar SMS (${code || 'desconocido'})`)
      }
      limpiarRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmarCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmationResult) return
    setError('')
    setLoading(true)
    try {
      await confirmarCodigo(confirmationResult, codigo)
      limpiarRecaptcha()
    } catch {
      setError('Código incorrecto. Intenta de nuevo.')
      setLoading(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-black text-white tracking-tight">ClickGo</p>
          <p className="text-gray-400 text-sm mt-1">Panel de control — Superadmin</p>
        </div>

        {/* Siempre en el DOM — igual que WorkerRegistrationForm */}
        <div id="recaptcha-container" className="flex justify-center mb-2" />

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          {paso === 'telefono' ? (
            <form onSubmit={handleEnviarSMS} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Número de teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="+52 844 000 0000"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
              >
                {loading ? 'Enviando…' : 'Enviar código SMS'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmarCodigo} className="space-y-4">
              <p className="text-gray-400 text-sm text-center">
                Código enviado a <span className="text-white">{telefono}</span>
              </p>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Código de verificación</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center tracking-widest"
                  placeholder="000000"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || codigo.length !== 6}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
              >
                {loading ? 'Verificando…' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setPaso('telefono'); setCodigo(''); setError('') }}
                className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors"
              >
                ← Cambiar número
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
