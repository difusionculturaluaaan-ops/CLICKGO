// ─── Organización (tenant) ────────────────────────────────────────────────────

export type OrgType = 'maquila' | 'universidad' | 'empresa' | 'colegio'

export interface Organization {
  id: string
  nombre: string
  tipo: OrgType
  branding: {
    logo?: string
    colorPrimario: string
    colorSecundario: string
  }
  config: {
    intervaloGPS: number        // segundos entre actualizaciones GPS
    distanciaAlerta: number     // metros para notificación push
    zonaHoraria: string
  }
  creadoEn: number             // timestamp Unix
}

// ─── Parada ───────────────────────────────────────────────────────────────────

export interface Parada {
  id: string
  nombre: string
  lat: number
  lng: number
  orden: number
  horaEstimada?: string        // "06:45"
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export type EstadoRuta = 'programada' | 'activa' | 'completada' | 'cancelada'
export type Turno = 'matutino' | 'vespertino' | 'nocturno' | 'mixto'

export interface Ruta {
  id: string
  orgId: string
  nombre: string
  turno: Turno
  paradas: Parada[]
  choferAsignado?: string      // userId del chofer
  unidad?: string              // número de unidad interno (ej: "U-12")
  placas?: string              // placas del vehículo (ej: "ABC-123-X")
  estado: EstadoRuta
  creadoEn: number
}

// ─── Ubicación en tiempo real ─────────────────────────────────────────────────

export interface Ubicacion {
  lat: number
  lng: number
  speed: number                // km/h
  heading: number              // grados 0-360
  accuracy: number             // metros
  timestamp: number            // Unix ms
  active: boolean
}

// ─── Usuario ──────────────────────────────────────────────────────────────────

export type RolUsuario = 'trabajador' | 'chofer' | 'admin' | 'superadmin'

export interface Usuario {
  id: string
  nombre: string
  telefono: string
  orgId: string
  rutaAsignada?: string        // rutaId (trabajadores — una sola parada)
  paradaAsignada?: string      // paradaId
  rutasAsignadas?: string[]    // rutaIds (choferes — pueden tener varias rutas/turnos)
  rol: RolUsuario
  empleadoId?: string          // solo para trabajadores (número de empleado maquiladora)
  numeroUnidad?: string        // solo para choferes/operadores
  fcmToken?: string            // para push notifications
  tiempoCaminataMin?: number   // minutos caminando desde casa habitual a su parada
  creadoEn: number
}

// ─── Preregistro de trabajador ────────────────────────────────────────────────

export interface Preregistro {
  empleadoId: string           // número de empleado (clave primaria)
  orgId: string
  rutaAsignada?: string        // rutaId pre-asignada
  paradaAsignada?: string      // paradaId pre-asignada
  vinculado?: boolean          // true cuando ya se registró con su cel
  creadoEn: number
}

// ─── Historial ────────────────────────────────────────────────────────────────

export interface RegistroHistorial {
  rutaId: string
  fecha: string                // "2026-03-30"
  inicioReal: number           // timestamp
  finReal?: number
  paradasCompletadas: string[] // paradaIds
  pasajerosTotal: number
}

// ─── ETA calculado ────────────────────────────────────────────────────────────

export interface ETAResult {
  minutos: number
  distanciaMetros: number
  estado: 'sin_senal' | 'en_camino' | 'ya_viene' | 'llegando'
}
