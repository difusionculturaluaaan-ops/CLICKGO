# ClickGo — Business Logic (Constitución del Proyecto)

> *"El trabajador sabe exactamente cuándo llega su camión. El chofer sabe exactamente dónde están sus trabajadores esperando. El coordinador tiene todo bajo control desde su panel."*

**Versión:** 1.0  
**Fecha:** 2026-04-01  
**Stack:** Next.js 16 + Firebase (Auth + Realtime DB + FCM) + Leaflet + OSRM

---

## 1. Qué Problema Resuelve

En Saltillo, miles de trabajadores de maquiladoras y estudiantes universitarios dependen de camiones de personal para llegar a su destino. Hoy:

- No saben si el camión ya pasó o cuánto falta
- Llaman al chofer o coordinador para preguntar
- Esperan en la calle sin información, generando estrés e impuntualidad

**ClickGo** conecta al chofer, al trabajador y al coordinador en una sola plataforma GPS en tiempo real. El trabajador ve en su celular cuántos minutos falta. El chofer transmite su posición automáticamente. El coordinador tiene visibilidad total de la flota.

---

## 2. Modelo de Negocio

| Concepto | Detalle |
|----------|---------|
| **Precio** | $500 MXN / bus / mes |
| **Cliente** | Empresa, maquiladora, universidad o colegio con flota propia |
| **Unidad de venta** | Por bus activo (no por usuario) |
| **Margen bruto estimado** | ~95% a partir de 10 buses |
| **Canal de venta** | Demo en vivo + WhatsApp (landing page) |
| **Prueba gratis** | 15 días sin tarjeta de crédito |

**Punto de equilibrio técnico:** ~3,900 buses simultáneos en Firebase Realtime DB (límite de conexiones WebSocket). Para escalas mayores se requiere sharding.

---

## 3. Multi-Tenant

Cada cliente es una **organización** (`orgId`). Todos los datos están aislados por `orgId`:

```
organizaciones/{orgId}
rutas/{rutaId}           → orgId
usuarios/{userId}        → orgId
ubicaciones/{rutaId}     → aislado por rutaId (que pertenece a una org)
historial/{orgId}/...
```

**Feature flags por org** (implementación pendiente):
```json
{
  "features": {
    "demanda_estudiantes": false,
    "rutas_doble_sentido": false,
    "validacion_matricula": false
  }
}
```

---

## 4. Actores y Roles

### 4.1 Trabajador (`rol: 'trabajador'`)
**Problema:** No sabe cuándo llega su camión.  
**Solución:** App móvil con mapa en tiempo real + ETA + push notification.

**Flujo:**
1. Inicia sesión con su número de teléfono (SMS OTP)
2. Su perfil tiene `rutaAsignada` y `paradaAsignada` (asignadas por el admin)
3. Ve el mapa con el camión moviéndose en tiempo real
4. Ve ETA en minutos y distancia
5. Recibe vibración + push notification cuando el camión está a ≤5 min
6. Ve su propia posición (punto azul) y la parada (punto verde)

**Estados del camión:**
- `sin_senal` — No ha iniciado ruta
- `en_camino` — En ruta, a más de 5 minutos
- `ya_viene` — A ≤5 minutos (vibra el celular)
- `llegando` — A ≤2 minutos (vibra el celular)

### 4.2 Chofer / Operador (`rol: 'chofer'`)
**Problema:** Necesita transmitir su posición sin distracciones.  
**Solución:** App simple con un botón grande — INICIAR / FINALIZAR.

**Flujo:**
1. Inicia sesión con su número de teléfono
2. Su perfil tiene `rutaAsignada`
3. Presiona **INICIAR RUTA** → comienza a transmitir GPS cada 12 segundos
4. Ve: velocidad actual, tiempo transcurrido, distancia recorrida, log GPS en vivo
5. Presiona **FINALIZAR RUTA** → para la transmisión y marca la ruta como completada
6. Alerta de batería baja (≤20%)

**Datos transmitidos por update GPS:**
```typescript
{ lat, lng, speed (km/h), heading (0-360°), accuracy (m), timestamp, active: true }
```

### 4.3 Administrador (`rol: 'admin'`)
**Problema:** Necesita visibilidad y control de toda la flota.  
**Solución:** Panel web con mapa en vivo, CRUD de rutas/usuarios, reportes y simulador.

**Módulos:**
- **Dashboard:** rutas activas en tiempo real, stats (total/activas/transmitiendo/sin señal)
- **Rutas:** CRUD completo de rutas y paradas, asignación de chofer
- **Usuarios:** CRUD + importación masiva por Excel (nombre, teléfono, rol, ruta)
- **Simulador:** Activa un camión ficticio en cualquier ruta para demos
- **Reportes:** KPIs de puntualidad por ruta, historial de viajes

---

## 5. Modelo de Datos (Firebase Realtime DB)

### Organización
```typescript
interface Organization {
  id: string
  nombre: string
  tipo: 'maquila' | 'universidad' | 'empresa' | 'colegio'
  branding: { logo?: string; colorPrimario: string; colorSecundario: string }
  config: { intervaloGPS: number; distanciaAlerta: number; zonaHoraria: string }
  creadoEn: number
}
```

### Ruta
```typescript
interface Ruta {
  id: string
  orgId: string
  nombre: string
  turno: 'matutino' | 'vespertino' | 'nocturno' | 'mixto'
  paradas: Parada[]
  choferAsignado?: string
  estado: 'programada' | 'activa' | 'completada' | 'cancelada'
  creadoEn: number
}
```

### Parada
```typescript
interface Parada {
  id: string
  nombre: string
  lat: number
  lng: number
  orden: number
  horaEstimada?: string  // "06:45"
}
```

### Usuario
```typescript
interface Usuario {
  id: string           // Firebase Auth UID
  nombre: string
  telefono: string     // formato +52XXXXXXXXXX
  orgId: string
  rol: 'trabajador' | 'chofer' | 'admin' | 'superadmin'
  rutaAsignada?: string
  paradaAsignada?: string
  fcmToken?: string
  creadoEn: number
}
```

### Ubicación (tiempo real)
```
/ubicaciones/{rutaId}   → se sobreescribe en cada update GPS
```
```typescript
interface Ubicacion {
  lat: number; lng: number
  speed: number      // km/h
  heading: number    // 0-360°
  accuracy: number   // metros
  timestamp: number  // Unix ms
  active: boolean
}
```

### Historial de viajes
```
/historial/{orgId}/{viajeId}
```
```typescript
interface RegistroViaje {
  rutaId: string; orgId: string; nombreRuta: string
  fecha: string           // "2026-04-01"
  inicioReal: number      // timestamp
  finReal?: number
  paradas: RegistroParada[]
  puntualidad: number     // 0-100%
}
```

---

## 6. Cálculo de ETA

```
distancia = haversine(camion.lat, camion.lng, parada.lat, parada.lng)
velocidad = camion.speed km/h → m/s (fallback: 30 km/h si speed=0)
eta_minutos = ceil(distancia / velocidad_ms / 60)

estado:
  activo=false → 'sin_senal'
  eta ≤ 2 min  → 'llegando'
  eta ≤ 5 min  → 'ya_viene'
  eta > 5 min  → 'en_camino'
```

**Ruta por calles (OSRM):** Para el simulador y futura app del chofer, se usa `router.project-osrm.org` para calcular waypoints sobre calles reales. Fallback a línea recta si OSRM falla.

---

## 7. Notificaciones Push (FCM)

- Al registrarse, el trabajador obtiene un `fcmToken` que se guarda en su perfil
- El estado del camión se evalúa cada vez que llega un update GPS
- Cuando cambia a `ya_viene` o `llegando` → vibración `[200, 100, 200]` + push
- Indicador de señal en tiempo real: 🟢 <30s / 🟡 30-60s / 🔴 >60s

---

## 8. Mapa

- **Tiles:** CARTO Dark (default) / CARTO Light (toggle ☀️/🌙)
- **Marcadores:**
  - 🟡 Bus (con flecha de heading que rota)
  - 🟢 Parada asignada del trabajador
  - 🔵 Posición actual del trabajador
- **Trail:** polyline teal que traza el recorrido del bus (últimos 200 puntos)
- **Compass:** heading en grados → texto (N, NE, E, SE, S, SO, O, NO)

---

## 9. Seguridad (Firebase Rules)

```
ubicaciones:    read=true, write=chofer OR admin
organizaciones: read=auth, write=admin propio
rutas:          read=auth, write=admin OR chofer
usuarios:       read/write=propio perfil OR admin
historial:      read=auth, write=admin
```

**Privacidad:** Los datos GPS del trabajador NUNCA se transmiten. Solo el working de parada asignada y su presencia en ella (feature futura para UAAAN).

---

## 10. Módulo Universidad (Pendiente — Fase 2)

**Cliente objetivo:** UAAAN (Universidad Autónoma Agraria Antonio Narro), Saltillo.  
**Ruta demo:** Ruta Buitre (10 paradas ida, 6 paradas vuelta).

**Features adicionales vs maquiladora:**

### 10.1 Rutas doble sentido
- Campo `sentido: 'ida' | 'vuelta'` en el modelo de ruta
- Toggle en app del estudiante para cambiar sentido

### 10.2 Señal de demanda ("Estoy esperando")
Permite a estudiantes señalizar que están esperando en una parada, sin exponer datos personales.

**Nodo Firebase:**
```
/esperando/{orgId}/{paradaId}/{hash}: { timestamp, paradaId }
```

**Hash:** `sha256(matricula + paradaId + fecha_dia)`  
→ Evita duplicados en la misma parada al mismo tiempo  
→ NO limita cuántas veces usa el camión al día (internado)  
→ El mismo estudiante puede registrarse en diferentes paradas  
→ El registro expira automáticamente a los 20 minutos

**Lo que ve el chofer:** contador por parada ("3 esperando") — sin nombres ni GPS del estudiante  
**Lo que ve el coordinador:** heat map (gris/ámbar/verde) + umbral ajustable por turno + historial  
**Privacidad:** nunca se expone nombre, foto ni ubicación GPS del estudiante

---

## 11. Rutas de la Aplicación

| Ruta | Rol | Descripción |
|------|-----|-------------|
| `/` | Público | Landing page (hero, métricas, pricing $500 MXN, WhatsApp) |
| `/trabajador` | Público | Login SMS del trabajador |
| `/trabajador/mapa` | Trabajador | Mapa en tiempo real + ETA |
| `/operador` | Público | Login SMS del chofer |
| `/operador/ruta` | Chofer | Panel de transmisión GPS |
| `/admin` | Público | Login SMS del administrador |
| `/admin/dashboard` | Admin | Vista general de la flota |
| `/admin/rutas` | Admin | CRUD de rutas y paradas |
| `/admin/usuarios` | Admin | CRUD + importación masiva Excel |
| `/admin/simulador` | Admin | Simulador de camión para demos |
| `/admin/reportes` | Admin | KPIs de puntualidad e historial |

---

## 12. Autenticación

- **Método:** Firebase Phone Auth (SMS OTP)
- **Test en desarrollo:** +528441186348 → código 123456
- **SMS real:** Requiere Firebase Blaze + Twilio (pendiente para producción)
- **Perfil:** Al primer login, se busca el perfil en `/usuarios/{uid}`. Si no existe, el admin lo crea manualmente o vía importación Excel.

---

## 13. Invariantes del Sistema (Reglas que nunca se rompen)

1. **El `orgId` siempre viene del perfil del usuario** — nunca hardcodeado en producción
2. **El GPS del trabajador nunca se transmite** — solo el del chofer
3. **La parada se asigna por el admin** — el trabajador no la elige
4. **Los datos de historial son inmutables** — solo se agregan, nunca se modifican
5. **Un bus = una ruta activa** — un chofer no puede transmitir en dos rutas simultáneas
6. **El hash de matrícula es diario** — se regenera cada día para el mismo usuario + parada

---

## 14. Lo Que Falta Para Producción

| Pendiente | Prioridad | Esfuerzo |
|-----------|-----------|---------|
| SMS real (Firebase Blaze + Twilio) | Alta | 2h |
| `orgId` dinámico desde perfil (quitar hardcode `org-demo-001`) | Alta | 3h |
| Módulo UAAAN (doble sentido + demanda) | Media | 1-2 días |
| QA automatizado con Playwright | Media | 4h |
| Dominio personalizado por cliente | Baja | 1h |
| App del chofer instalable como PWA | Baja | 2h |

---

*Este documento es la fuente de verdad del proyecto. Cualquier feature nueva debe ser consistente con estas reglas antes de implementarse.*
