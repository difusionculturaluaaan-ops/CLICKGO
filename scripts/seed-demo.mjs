/**
 * Seed de rutas demo para ClickGo — 4 puntos cardinales de Saltillo
 * Uso: node scripts/seed-demo.mjs <ID_TOKEN>
 */

const DB_URL = 'https://sigo-55fff-default-rtdb.firebaseio.com'
const TOKEN  = process.argv[2]

if (!TOKEN) {
  console.error('⚠️  Falta el ID_TOKEN. Usa: node scripts/seed-demo.mjs <token>')
  process.exit(1)
}

const ORG = {
  'org-demo-001': {
    id: 'org-demo-001',
    nombre: 'Transportes Industriales Saltillo',
    tipo: 'maquila',
    branding: { colorPrimario: '#0f766e', colorSecundario: '#134e4a' },
    config: { intervaloGPS: 12, distanciaAlerta: 500, zonaHoraria: 'America/Monterrey' },
    creadoEn: Date.now(),
  },
}

const FINSA = { id: 'p-finsa', nombre: 'FINSA — Entrada Principal', lat: 25.4560, lng: -100.9670, horaEstimada: '06:10' }

const RUTAS = {
  'ruta-norte-001': {
    id: 'ruta-norte-001', orgId: 'org-demo-001',
    nombre: 'Ruta Norte — Villas del Norte', turno: 'matutino', estado: 'programada', creadoEn: Date.now(),
    paradas: [
      { id: 'p-n1', nombre: 'Villas del Norte',        lat: 25.4782, lng: -100.9941, orden: 1, horaEstimada: '05:30' },
      { id: 'p-n2', nombre: 'Col. Los Pinos',           lat: 25.4710, lng: -100.9928, orden: 2, horaEstimada: '05:38' },
      { id: 'p-n3', nombre: 'Valle de Lincoln',         lat: 25.4638, lng: -100.9906, orden: 3, horaEstimada: '05:45' },
      { id: 'p-n4', nombre: 'Blvd. Fundadores Norte',   lat: 25.4580, lng: -100.9850, orden: 4, horaEstimada: '05:52' },
      { id: 'p-n5', nombre: 'Sendero / HEB Norte',      lat: 25.4542, lng: -100.9780, orden: 5, horaEstimada: '05:58' },
      { ...FINSA, orden: 6 },
    ],
  },
  'ruta-sur-001': {
    id: 'ruta-sur-001', orgId: 'org-demo-001',
    nombre: 'Ruta Sur — San Isidro', turno: 'matutino', estado: 'programada', creadoEn: Date.now(),
    paradas: [
      { id: 'p-s1', nombre: 'Col. San Isidro',          lat: 25.3780, lng: -101.0115, orden: 1, horaEstimada: '05:15' },
      { id: 'p-s2', nombre: 'Las Quintas',               lat: 25.3910, lng: -101.0050, orden: 2, horaEstimada: '05:24' },
      { id: 'p-s3', nombre: 'Blvd. Echeverría',          lat: 25.4050, lng: -100.9990, orden: 3, horaEstimada: '05:33' },
      { id: 'p-s4', nombre: 'Alameda Sur',               lat: 25.4160, lng: -100.9972, orden: 4, horaEstimada: '05:42' },
      { id: 'p-s5', nombre: 'Mercado Juárez',            lat: 25.4232, lng: -100.9963, orden: 5, horaEstimada: '05:50' },
      { ...FINSA, orden: 6 },
    ],
  },
  'ruta-este-001': {
    id: 'ruta-este-001', orgId: 'org-demo-001',
    nombre: 'Ruta Este — Las Flores', turno: 'matutino', estado: 'programada', creadoEn: Date.now(),
    paradas: [
      { id: 'p-e1', nombre: 'Col. Las Flores',           lat: 25.4248, lng: -100.9258, orden: 1, horaEstimada: '05:20' },
      { id: 'p-e2', nombre: 'Col. Libertad',             lat: 25.4270, lng: -100.9380, orden: 2, horaEstimada: '05:28' },
      { id: 'p-e3', nombre: 'Blvd. Colosio Este',        lat: 25.4292, lng: -100.9510, orden: 3, horaEstimada: '05:36' },
      { id: 'p-e4', nombre: 'Col. República Poniente',   lat: 25.4310, lng: -100.9650, orden: 4, horaEstimada: '05:44' },
      { id: 'p-e5', nombre: 'Centro / Plaza de Armas',   lat: 25.4232, lng: -100.9963, orden: 5, horaEstimada: '05:54' },
      { ...FINSA, orden: 6 },
    ],
  },
  'ruta-oeste-001': {
    id: 'ruta-oeste-001', orgId: 'org-demo-001',
    nombre: 'Ruta Oeste — Las Cumbres', turno: 'matutino', estado: 'programada', creadoEn: Date.now(),
    paradas: [
      { id: 'p-o1', nombre: 'Las Cumbres',               lat: 25.4385, lng: -101.0582, orden: 1, horaEstimada: '05:10' },
      { id: 'p-o2', nombre: 'Lomas Vallarta',            lat: 25.4360, lng: -101.0450, orden: 2, horaEstimada: '05:18' },
      { id: 'p-o3', nombre: 'Col. San Jorge',            lat: 25.4340, lng: -101.0305, orden: 3, horaEstimada: '05:26' },
      { id: 'p-o4', nombre: 'Blvd. Nazario Ortiz',       lat: 25.4320, lng: -101.0150, orden: 4, horaEstimada: '05:34' },
      { id: 'p-o5', nombre: 'Periférico Luis Echeverría',lat: 25.4310, lng: -101.0005, orden: 5, horaEstimada: '05:44' },
      { ...FINSA, orden: 6 },
    ],
  },
}

async function patch(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json?auth=${TOKEN}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  console.log('🚌 Seed de rutas demo — Saltillo 4 puntos cardinales\n')
  try {
    await patch('organizaciones', ORG)
    console.log('✅ Organización: Transportes Industriales Saltillo')
    await patch('rutas', RUTAS)
    console.log('✅ Ruta Norte  — Villas del Norte  (6 paradas)')
    console.log('✅ Ruta Sur    — San Isidro         (6 paradas)')
    console.log('✅ Ruta Este   — Las Flores         (6 paradas)')
    console.log('✅ Ruta Oeste  — Las Cumbres        (6 paradas)')
    console.log('\n🎉 Listo. Abre: http://localhost:3000/admin/rutas\n')
  } catch (e) {
    console.error('❌', e.message)
    process.exit(1)
  }
}

main()
