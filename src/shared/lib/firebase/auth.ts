import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from './config'
import { crearOActualizarUsuario, obtenerUsuario } from './database'

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────

let recaptchaVerifier: RecaptchaVerifier | null = null

/**
 * Inicializa el reCAPTCHA invisible en el elemento con id "recaptcha-container"
 * Llamar una sola vez en el componente de login
 */
export function inicializarRecaptcha(): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
  })
  return recaptchaVerifier
}

export function limpiarRecaptcha(): void {
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}

// ─── Login con teléfono (SMS OTP) ────────────────────────────────────────────

/**
 * Paso 1: Envía SMS con código de verificación
 * El teléfono debe incluir código de país: "+521234567890"
 */
export async function enviarCodigoSMS(telefono: string): Promise<ConfirmationResult> {
  const verifier = inicializarRecaptcha()
  return signInWithPhoneNumber(auth, telefono, verifier)
}

/**
 * Paso 2: Confirma el código recibido por SMS
 * Retorna el usuario autenticado
 */
export async function confirmarCodigo(
  confirmationResult: ConfirmationResult,
  codigo: string
): Promise<User> {
  const result = await confirmationResult.confirm(codigo)
  return result.user
}

// ─── Sesión ───────────────────────────────────────────────────────────────────

export function cerrarSesion(): Promise<void> {
  return signOut(auth)
}

/**
 * Suscribe a cambios de estado de autenticación
 * Retorna función para cancelar la suscripción
 */
export function escucharSesion(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export function usuarioActual(): User | null {
  return auth.currentUser
}

// ─── Sincronizar usuario con Realtime DB ─────────────────────────────────────

/**
 * Al hacer login, sincroniza/crea el perfil en /usuarios/{uid}
 */
export async function sincronizarPerfilUsuario(
  user: User,
  datosExtra?: { orgId?: string; rutaAsignada?: string; paradaAsignada?: string }
): Promise<void> {
  const existente = await obtenerUsuario(user.uid)
  if (existente) {
    // Solo actualiza fcmToken si ya existe
    await crearOActualizarUsuario(user.uid, { fcmToken: undefined })
    return
  }
  // Primera vez: crea el perfil con rol 'trabajador' por defecto
  await crearOActualizarUsuario(user.uid, {
    id: user.uid,
    nombre: user.displayName ?? '',
    telefono: user.phoneNumber ?? '',
    orgId: datosExtra?.orgId ?? '',
    rutaAsignada: datosExtra?.rutaAsignada,
    paradaAsignada: datosExtra?.paradaAsignada,
    rol: 'trabajador',
    creadoEn: Date.now(),
  })
}
