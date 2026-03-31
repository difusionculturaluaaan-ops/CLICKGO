/**
 * Seed script — inserta datos de prueba en Firebase Realtime DB
 * Uso: node scripts/seed-demo.mjs
 *
 * No requiere dependencias extra — usa fetch nativo (Node 18+)
 */

const DB_URL = 'https://sigo-55fff-default-rtdb.firebaseio.com'

async function write(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Error en ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function seed() {
  console.log('🌱 Iniciando seed de datos demo...\n')

  // ── 1. Organización ────────────────────────────────────────────────────────
  await write('organizaciones/org-demo-001', {
    id: 'org-demo-001',
    nombre: 'Transportes Saltillo Demo',
    tipo: 'maquila',
    branding: { colorPrimario: '#0f766e', colorSecundario: '#134e4a' },
    config: { intervaloGPS: 12, distanciaAlerta: 500, zonaHoraria: 'America/Monterrey' },
    creadoEn: Date.now(),
  })
  console.log('✅ Organización creada: Transportes Saltillo Demo')

  // ── 2. Ruta con paradas reales en Saltillo ─────────────────────────────────
  // Ruta: Zona Periférica → Parque Industrial → Ciudad Industrial
  const paradas = [
    { id: 'p1', nombre: 'Col. San Isidro', lat: 25.4580, lng: -101.0120, orden: 1, horaEstimada: '06:00' },
    { id: 'p2', nombre: 'Blvd. Fundadores / Periférico', lat: 25.4480, lng: -100.9980, orden: 2, horaEstimada: '06:12' },
    { id: 'p3', nombre: 'Plaza Fundadores', lat: 25.4232, lng: -100.9963, orden: 3, horaEstimada: '06:25' },
    { id: 'p4', nombre: 'Parque Industrial Saltillo', lat: 25.3990, lng: -100.9850, orden: 4, horaEstimada: '06:38' },
    { id: 'p5', nombre: 'Ciudad Industrial', lat: 25.3820, lng: -100.9710, orden: 5, horaEstimada: '06:50' },
  ]

  await write('rutas/ruta-demo-001', {
    id: 'ruta-demo-001',
    orgId: 'org-demo-001',
    nombre: 'Ruta Norte → Ciudad Industrial',
    turno: 'matutino',
    paradas,
    choferAsignado: 'chofer-demo-001',
    estado: 'activa',
    creadoEn: Date.now(),
  })
  console.log('✅ Ruta creada: Ruta Norte → Ciudad Industrial (5 paradas)')

  // ── 3. Segunda ruta (sin transmisión para probar estado "programada") ───────
  await write('rutas/ruta-demo-002', {
    id: 'ruta-demo-002',
    orgId: 'org-demo-001',
    nombre: 'Ruta Sur → Ramos Arizpe',
    turno: 'vespertino',
    paradas: [
      { id: 'p1', nombre: 'Centro Saltillo', lat: 25.4161, lng: -101.0020, orden: 1, horaEstimada: '14:00' },
      { id: 'p2', nombre: 'Col. República', lat: 25.4050, lng: -100.9900, orden: 2, horaEstimada: '14:15' },
      { id: 'p3', nombre: 'Ramos Arizpe Centro', lat: 25.5430, lng: -100.9480, orden: 3, horaEstimada: '14:35' },
    ],
    choferAsignado: 'chofer-demo-002',
    estado: 'programada',
    creadoEn: Date.now(),
  })
  console.log('✅ Ruta creada: Ruta Sur → Ramos Arizpe (programada / vespertino)')

  // ── 4. Usuarios demo ───────────────────────────────────────────────────────
  await write('usuarios/chofer-demo-001', {
    id: 'chofer-demo-001',
    nombre: 'Carlos Mendoza',
    telefono: '+528441234567',
    orgId: 'org-demo-001',
    rutaAsignada: 'ruta-demo-001',
    rol: 'chofer',
    creadoEn: Date.now(),
  })

  await write('usuarios/trabajador-demo-001', {
    id: 'trabajador-demo-001',
    nombre: 'María López',
    telefono: '+528447654321',
    orgId: 'org-demo-001',
    rutaAsignada: 'ruta-demo-001',
    paradaAsignada: 'p3', // Plaza Fundadores
    rol: 'trabajador',
    creadoEn: Date.now(),
  })

  await write('usuarios/admin-demo-001', {
    id: 'admin-demo-001',
    nombre: 'Admin Demo',
    telefono: '+528440000000',
    orgId: 'org-demo-001',
    rol: 'admin',
    creadoEn: Date.now(),
  })
  console.log('✅ Usuarios creados: 1 chofer, 1 trabajador, 1 admin')

  // ── 5. Ubicación simulada del camión ───────────────────────────────────────
  // Camión cerca de Blvd. Fundadores, en camino a Plaza Fundadores (~2.5 km)
  await write('ubicaciones/ruta-demo-001', {
    lat: 25.4380,
    lng: -100.9970,
    speed: 42,
    heading: 180,
    accuracy: 8,
    timestamp: Date.now(),
    active: true,
  })
  console.log('✅ Ubicación simulada: camión en Blvd. Fundadores (activo, 42 km/h)')

  console.log('\n🎉 Seed completo!')
  console.log('\n📱 Prueba el sistema:')
  console.log('   Trabajador → http://localhost:3000/trabajador/mapa')
  console.log('   Admin      → http://localhost:3000/admin/dashboard')
  console.log('   Operador   → http://localhost:3000/operador')
  console.log('\n⚠️  IMPORTANTE: Las reglas de Firebase deben estar en modo TEST')
  console.log('   (lectura/escritura pública) para que el seed funcione sin auth.')
}

seed().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
