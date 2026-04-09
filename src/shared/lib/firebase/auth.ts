import {
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from './config'
import { crearOActualizarUsuario, obtenerUsuario, buscarUsuarioPorTelefono, vincularPerfilAlUid } from './database'

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────

let recaptchaVerifier: RecaptchaVerifier | null = null

/**
 * Inicializa el reCAPTCHA invisible en el elemento con id "recaptcha-container"
 * Llamar una sola vez en el componente de login
 */
export function inicializarRecaptcha(): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier
  // 'normal' muestra checkbox en vez de invisible para evitar redirecciones en iOS Safari
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
    callback: () => {},
    'expired-callback': () => { limpiarRecaptcha() },
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

// ─── Login con email y contraseña ────────────────────────────────────────────

export async function iniciarSesionEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
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
  datosExtra?: { orgId?: string; rol?: 'trabajador' | 'chofer'; rutaAsignada?: string; paradaAsignada?: string }
): Promise<void> {
  if (!datosExtra?.orgId) return

  let existente = null
  try {
    existente = await obtenerUsuario(user.uid)
  } catch {
    return
  }

  if (existente) return

  // Buscar perfil pre-creado por admin via teléfono (operadores)
  const telefono = user.phoneNumber ?? ''
  try {
    const preCreado = await buscarUsuarioPorTelefono(telefono, datosExtra.orgId)
    if (preCreado) {
      await vincularPerfilAlUid(user.uid, preCreado)
      return
    }
  } catch { /* continuar */ }

  // Crear perfil nuevo (solo para chofer sin pre-registro — no aplica a trabajadores)
  if (datosExtra.rol !== 'trabajador') {
    await crearOActualizarUsuario(user.uid, {
      id: user.uid,
      nombre: '',
      telefono,
      orgId: datosExtra.orgId,
      rol: datosExtra.rol ?? 'chofer',
      creadoEn: Date.now(),
    })
  }
}
