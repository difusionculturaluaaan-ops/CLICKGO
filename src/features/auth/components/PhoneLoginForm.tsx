'use client'
import { useState } from 'react'
import type { ConfirmationResult } from 'firebase/auth'
import { enviarCodigoSMS, confirmarCodigo, sincronizarPerfilUsuario } from '@/shared/lib/firebase/auth'

type Paso = 'telefono' | 'codigo'

const PHONE_REGEX = /^\+\d{10,15}$/
const SMS_COOLDOWN_MS = 30_000

export function PhoneLoginForm() {
  const [paso, setPaso] = useState<Paso>('telefono')
  const [telefono, setTelefono] = useState('+52')
  const [codigo, setCodigo] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [ultimoEnvio, setUltimoEnvio] = useState(0)
  const [cooldownSeg, setCooldownSeg] = useState(0)

  // Contador de cooldown visible
  useState(() => {
    const interval = setInterval(() => {
      const restante = Math.ceil((ultimoEnvio + SMS_COOLDOWN_MS - Date.now()) / 1000)
      setCooldownSeg(restante > 0 ? restante : 0)
    }, 1000)
    return () => clearInterval(interval)
  })

  async function handleEnviarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!PHONE_REGEX.test(telefono)) {
      setError('Formato inválido. Usa: +521234567890 (10 dígitos después de +52)')
      return
    }
    if (Date.now() - ultimoEnvio < SMS_COOLDOWN_MS) {
      setError(`Espera ${cooldownSeg} segundos antes de reenviar.`)
      return
    }

    setCargando(true)
    try {
      const result = await enviarCodigoSMS(telefono)
      setConfirmation(result)
      setUltimoEnvio(Date.now())
      setPaso('codigo')
    } catch (err: unknown) {
      setError('No se pudo enviar el SMS. Verifica el número e intenta de nuevo.')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleConfirmarCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmation) return
    setError('')
    setCargando(true)
    try {
      const user = await confirmarCodigo(confirmation, codigo)
      await sincronizarPerfilUsuario(user)
      // El redirect lo maneja el padre via useAuth
    } catch {
      setError('Código incorrecto. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* reCAPTCHA invisible — Firebase lo requiere */}
      <div id="recaptcha-container" />

      {paso === 'telefono' ? (
        <form onSubmit={handleEnviarCodigo} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-teal-900 mb-1">
              Número de teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+521234567890"
              required
              className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg text-gray-900 placeholder:text-gray-400"
            />
            <p className="text-xs text-teal-600 mt-1">Incluye el código de país: +52 para México</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando || cooldownSeg > 0}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Enviando...' : cooldownSeg > 0 ? `Reenviar en ${cooldownSeg}s` : 'Enviar código SMS'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmarCodigo} className="flex flex-col gap-4">
          <p className="text-sm text-teal-700">
            Ingresa el código de 6 dígitos enviado a <strong>{telefono}</strong>
          </p>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            className="w-full px-4 py-4 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-3xl text-center tracking-widest"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando || codigo.length !== 6}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => { setPaso('telefono'); setCodigo(''); setError('') }}
            className="text-sm text-teal-600 underline"
          >
            Cambiar número
          </button>
        </form>
      )}
    </div>
  )
}
