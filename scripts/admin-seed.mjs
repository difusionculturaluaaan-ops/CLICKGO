import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { getAuth } from 'firebase-admin/auth'

const SA = 'C:/Users/image/Downloads/sigo-55fff-firebase-adminsdk-fbsvc-35610ac2b6.json'
const { createRequire } = await import('module')
const require = createRequire(import.meta.url)
const serviceAccount = require(SA)

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://sigo-55fff-default-rtdb.firebaseio.com'
})

const db = getDatabase()
const auth = getAuth()

// Busca el UID real de un número de teléfono; crea el usuario si no existe
async function resolverUID(telefono) {
  try {
    const user = await auth.getUserByPhoneNumber(telefono)
    return user.uid
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({ phoneNumber: telefono })
      console.log(`  → Usuario creado en Firebase Auth: ${newUser.uid}`)
      return newUser.uid
    }
    throw err
  }
}

const FINSA = { id: 'p-finsa', nombre: 'FINSA — Entrada Principal', lat: 25.4560, lng: -100.9670, orden: 6, horaEstimada: '06:10' }

const RUTAS = {
  'ruta-norte-001': {
    id: 'ruta-norte-001', orgId: 'org-demo-001', nombre: 'Ruta Norte — Villas del Norte',
    turno: 'matutino', estado: 'programada', unidad: 'U-01', placas: 'NTR-100-A', creadoEn: Date.now(),
    paradas: [
      { id:'p-n1', nombre:'Villas del Norte',         lat:25.4782, lng:-100.9941, orden:1, horaEstimada:'05:30' },
      { id:'p-n2', nombre:'Col. Los Pinos',            lat:25.4710, lng:-100.9928, orden:2, horaEstimada:'05:38' },
      { id:'p-n3', nombre:'Valle de Lincoln',          lat:25.4638, lng:-100.9906, orden:3, horaEstimada:'05:45' },
      { id:'p-n4', nombre:'Blvd. Fundadores Norte',    lat:25.4580, lng:-100.9850, orden:4, horaEstimada:'05:52' },
      { id:'p-n5', nombre:'Sendero / HEB Norte',       lat:25.4542, lng:-100.9780, orden:5, horaEstimada:'05:58' },
      FINSA,
    ],
  },
  'ruta-sur-001': {
    id: 'ruta-sur-001', orgId: 'org-demo-001', nombre: 'Ruta Sur — San Isidro',
    turno: 'matutino', estado: 'programada', unidad: 'U-02', placas: 'SUR-200-B', creadoEn: Date.now(),
    paradas: [
      { id:'p-s1', nombre:'Col. San Isidro',           lat:25.3780, lng:-101.0115, orden:1, horaEstimada:'05:15' },
      { id:'p-s2', nombre:'Las Quintas',                lat:25.3910, lng:-101.0050, orden:2, horaEstimada:'05:24' },
      { id:'p-s3', nombre:'Blvd. Echeverría',           lat:25.4050, lng:-100.9990, orden:3, horaEstimada:'05:33' },
      { id:'p-s4', nombre:'Alameda Sur',                lat:25.4160, lng:-100.9972, orden:4, horaEstimada:'05:42' },
      { id:'p-s5', nombre:'Mercado Juárez',             lat:25.4232, lng:-100.9963, orden:5, horaEstimada:'05:50' },
      FINSA,
    ],
  },
  'ruta-este-001': {
    id: 'ruta-este-001', orgId: 'org-demo-001', nombre: 'Ruta Este — Las Flores',
    turno: 'matutino', estado: 'programada', unidad: 'U-03', placas: 'EST-300-C', creadoEn: Date.now(),
    paradas: [
      { id:'p-e1', nombre:'Col. Las Flores',            lat:25.4248, lng:-100.9258, orden:1, horaEstimada:'05:20' },
      { id:'p-e2', nombre:'Col. Libertad',              lat:25.4270, lng:-100.9380, orden:2, horaEstimada:'05:28' },
      { id:'p-e3', nombre:'Blvd. Colosio Este',         lat:25.4292, lng:-100.9510, orden:3, horaEstimada:'05:36' },
      { id:'p-e4', nombre:'Col. República Poniente',    lat:25.4310, lng:-100.9650, orden:4, horaEstimada:'05:44' },
      { id:'p-e5', nombre:'Centro / Plaza de Armas',    lat:25.4232, lng:-100.9963, orden:5, horaEstimada:'05:54' },
      FINSA,
    ],
  },
  'ruta-oeste-001': {
    id: 'ruta-oeste-001', orgId: 'org-demo-001', nombre: 'Ruta Oeste — Las Cumbres',
    turno: 'matutino', estado: 'programada', unidad: 'U-04', placas: 'OES-400-D', creadoEn: Date.now(),
    paradas: [
      { id:'p-o1', nombre:'Las Cumbres',                lat:25.4385, lng:-101.0582, orden:1, horaEstimada:'05:10' },
      { id:'p-o2', nombre:'Lomas Vallarta',             lat:25.4360, lng:-101.0450, orden:2, horaEstimada:'05:18' },
      { id:'p-o3', nombre:'Col. San Jorge',             lat:25.4340, lng:-101.0305, orden:3, horaEstimada:'05:26' },
      { id:'p-o4', nombre:'Blvd. Nazario Ortiz',        lat:25.4320, lng:-101.0150, orden:4, horaEstimada:'05:34' },
      { id:'p-o5', nombre:'Periférico Luis Echeverría', lat:25.4310, lng:-101.0005, orden:5, horaEstimada:'05:44' },
      FINSA,
    ],
  },
}

console.log('🚌 Admin seed — ClickGo\n')

// ── Rutas — limpiar duplicados y reescribir las 4 correctas ───────────────
await db.ref('rutas').set(null)
console.log('🗑️  Rutas antiguas eliminadas')
await db.ref('rutas').update(RUTAS)
console.log('✅ 4 rutas con IDs fijos escritas')

// ── Usuarios — limpiar duplicados ─────────────────────────────────────────
await db.ref('usuarios').set(null)
console.log('🗑️  Usuarios duplicados eliminados')

// ── Trabajadora: María López ───────────────────────────────────────────────
console.log('\n👷 Resolviendo UID de María López (+528447654321)…')
const uidTrabajadora = await resolverUID('+528447654321')
console.log(`  → UID: ${uidTrabajadora}`)
await db.ref(`usuarios/${uidTrabajadora}`).set({
  id: uidTrabajadora,
  nombre: 'María López',
  telefono: '+528447654321',
  orgId: 'org-demo-001',
  rol: 'trabajador',
  rutaAsignada: 'ruta-sur-001',
  paradaAsignada: 'p-s3',
  creadoEn: 1743516000000,
})
console.log('✅ Perfil de María López escrito')

// ── Chofer: Carlos Mendoza ─────────────────────────────────────────────────
console.log('\n🚌 Resolviendo UID de Carlos Mendoza (+528440000001)…')
const uidChofer = await resolverUID('+528440000001')
console.log(`  → UID: ${uidChofer}`)
await db.ref(`usuarios/${uidChofer}`).set({
  id: uidChofer,
  nombre: 'Carlos Mendoza',
  telefono: '+528440000001',
  orgId: 'org-demo-001',
  rol: 'chofer',
  rutaAsignada: 'ruta-sur-001',
  creadoEn: Date.now(),
})
console.log('✅ Perfil de Carlos Mendoza escrito')

// ── Admin ──────────────────────────────────────────────────────────────────
console.log('\n🔑 Resolviendo UID del Admin (+528441186348)…')
const uidAdmin = await resolverUID('+528441186348')
console.log(`  → UID: ${uidAdmin}`)
await db.ref(`usuarios/${uidAdmin}`).set({
  id: uidAdmin,
  nombre: 'Administrador',
  telefono: '+528441186348',
  orgId: 'org-demo-001',
  rol: 'admin',
  creadoEn: Date.now(),
})
console.log('✅ Perfil de Admin escrito')

console.log('\n📋 Resumen UIDs:')
console.log(`  Trabajadora: ${uidTrabajadora}`)
console.log(`  Chofer:      ${uidChofer}`)
console.log('\n⚠️  Agrega estos teléfonos como números de prueba en Firebase Console:')
console.log('  → +528447654321  código: 123456')
console.log('  → +528440000001  código: 000001')
console.log('\n🎉 Listo.\n')
process.exit(0)
