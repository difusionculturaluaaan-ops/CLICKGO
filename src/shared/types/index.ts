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
  rutaAsignada?: string        // rutaId
  paradaAsignada?: string      // paradaId
  rol: RolUsuario
  fcmToken?: string            // para push notifications
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
