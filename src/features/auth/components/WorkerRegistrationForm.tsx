'use client'
import { useState } from 'react'
import type { ConfirmationResult } from 'firebase/auth'
import { enviarCodigoSMS, confirmarCodigo, limpiarRecaptcha } from '@/shared/lib/firebase/auth'
import { obtenerPreregistro, marcarPreregistroVinculado, crearOActualizarUsuario, obtenerUsuario } from '@/shared/lib/firebase/database'

type Paso = 'empleado' | 'telefono' | 'codigo'

const PHONE_REGEX = /^\+\d{10,15}$/
const SMS_COOLDOWN_MS = 30_000

interface WorkerRegistrationFormProps {
  orgId: string
}

export function WorkerRegistrationForm({ orgId }: WorkerRegistrationFormProps) {
  const [paso, setPaso] = useState<Paso>('empleado')
  const [empleadoId, setEmpleadoId] = useState('')
  const [telefono, setTelefono] = useState('+52')
  const [codigo, setCodigo] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [preregistro, setPreregistro] = useState<{ rutaAsignada?: string; paradaAsignada?: string } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [ultimoEnvio, setUltimoEnvio] = useState(0)
  const [cooldownSeg, setCooldownSeg] = useState(0)

  useState(() => {
    const interval = setInterval(() => {
      const restante = Math.ceil((ultimoEnvio + SMS_COOLDOWN_MS - Date.now()) / 1000)
      setCooldownSeg(restante > 0 ? restante : 0)
    }, 1000)
    return () => clearInterval(interval)
  })

  async function handleValidarEmpleado(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const id = empleadoId.trim().toUpperCase()
    if (!id) { setError('Ingresa tu número de empleado.'); return }
    setCargando(true)
    try {
      const pre = await obtenerPreregistro(orgId, id)
      if (!pre) {
        setError('Número de empleado no encontrado. Contacta a tu supervisor o RRHH.')
        setCargando(false)
        return
      }
      setEmpleadoId(id)
      setPreregistro({ rutaAsignada: pre.rutaAsignada, paradaAsignada: pre.paradaAsignada })
      setPaso('telefono')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function handleEnviarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!PHONE_REGEX.test(telefono)) {
      setError('Formato inválido. Usa: +521234567890')
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
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else if (code === 'auth/invalid-phone-number') {
        setError('Número inválido. Usa formato +52XXXXXXXXXX (10 dígitos).')
      } else if (code === 'auth/captcha-check-failed' || code === 'auth/network-request-failed') {
        setError('Error de red o reCAPTCHA. Abre la app en Chrome o Safari (no desde WhatsApp).')
      } else {
        setError(`No se pudo enviar el SMS. (${code || 'error desconocido'})`)
      }
      console.error('[SMS error]', err)
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
      const result = await confirmation.confirm(codigo)
      const user = result.user

      // Verificar si ya tiene perfil (cel registrado antes)
      const existente = await obtenerUsuario(user.uid)
      if (existente) {
        // Ya registrado — actualizar empleadoId por si cambió
        await marcarPreregistroVinculado(orgId, empleadoId)
        return
      }

      // Crear perfil del trabajador con datos del preregistro
      const last4 = telefono.slice(-4)
      await crearOActualizarUsuario(user.uid, {
        id: user.uid,
        nombre: `${empleadoId} / ••••${last4}`,
        telefono,
        orgId,
        rol: 'trabajador',
        empleadoId,
        rutaAsignada: preregistro?.rutaAsignada,
        paradaAsignada: preregistro?.paradaAsignada,
        creadoEn: Date.now(),
      })
      await marcarPreregistroVinculado(orgId, empleadoId)
      limpiarRecaptcha()
    } catch {
      setError('Código incorrecto. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div id="recaptcha-container" className="flex justify-center" />

      {paso === 'empleado' && (
        <form onSubmit={handleValidarEmpleado} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-teal-900 mb-1">
              Número de empleado
            </label>
            <input
              type="text"
              value={empleadoId}
              onChange={e => setEmpleadoId(e.target.value.toUpperCase())}
              placeholder="EMP-0042"
              required
              className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg text-gray-900 placeholder:text-gray-400 uppercase"
            />
            <p className="text-xs text-teal-600 mt-1">El número de empleado que te proporcionó tu empresa</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Verificando...' : 'Continuar'}
          </button>
        </form>
      )}

      {paso === 'telefono' && (
        <form onSubmit={handleEnviarCodigo} className="flex flex-col gap-4">
          <div className="bg-teal-50 rounded-xl px-3 py-2 text-sm text-teal-700">
            Empleado <strong>{empleadoId}</strong> verificado
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-900 mb-1">
              Tu número de celular
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="+521234567890"
              required
              className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg text-gray-900 placeholder:text-gray-400"
            />
            <p className="text-xs text-teal-600 mt-1">Incluye código de país: +52 para México</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando || cooldownSeg > 0}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Enviando...' : cooldownSeg > 0 ? `Reenviar en ${cooldownSeg}s` : 'Enviar código SMS'}
          </button>
          <button type="button" onClick={() => { setPaso('empleado'); setError('') }} className="text-sm text-teal-600 underline">
            Cambiar número de empleado
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={handleConfirmarCodigo} className="flex flex-col gap-4">
          <p className="text-sm text-teal-700">
            Código enviado a <strong>{telefono}</strong>
          </p>
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            className="w-full px-4 py-4 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-3xl text-center tracking-widest text-gray-900"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando || codigo.length !== 6}
            className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
          <button type="button" onClick={() => { setPaso('telefono'); setCodigo(''); setError('') }} className="text-sm text-teal-600 underline">
            Cambiar número
          </button>
        </form>
      )}
    </div>
  )
}
