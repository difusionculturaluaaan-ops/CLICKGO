# ClickGo — Guía de Piloto y Agente IA

> Versión 1.0 · Abril 2026 · Saltillo, Coahuila

---

## PARTE 1 — Preparar Firebase antes del piloto

### Paso 1 — Activar plan Blaze (requerido para SMS)

1. Abre [console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona tu proyecto ClickGo
3. Engrane ⚙️ → **Uso y facturación** → **Modificar plan** → **Blaze (pago por uso)**
4. Conecta tarjeta de crédito
5. Costo estimado 15 días con ~20 usuarios: **menos de $5 USD**

### Paso 2 — Habilitar login por teléfono

1. Firebase Console → **Authentication** → **Sign-in method**
2. Habilitar **Teléfono**
3. Guardar

### Paso 3 — Aplicar reglas de seguridad

1. Firebase Console → **Realtime Database** → **Reglas**
2. Borrar el contenido actual
3. Pegar el contenido del archivo `database.rules.json` del proyecto
4. Clic en **Publicar**

---

## PARTE 2 — Dar de alta al Operador

**URL del sistema admin:** https://clickgo.vercel.app/admin

1. Login como administrador
2. Ir a **Usuarios** → **+ Agregar**
3. Seleccionar rol **🚌 Operador**
4. Llenar los campos:
   - Nombre completo
   - Teléfono con código de país (`+521234567890`)
   - No. de unidad (ej. `U-01`)
   - Ruta asignada
5. Clic en **Crear**

### El operador accede desde su celular

- **URL:** https://clickgo.vercel.app/operador
- Ingresa su número de teléfono
- Recibe SMS con código de 6 dígitos
- Entra y ve su ruta activa con GPS

---

## PARTE 3 — Dar de alta al Trabajador

**URL del sistema admin:** https://clickgo.vercel.app/admin/usuarios

1. Clic en **+ Agregar**
2. Seleccionar rol **👷 Trabajador**
3. Llenar los campos:
   - Nombre completo
   - Teléfono (`+521234567890`)
   - Ruta asignada
   - Parada asignada (la más cercana a su casa)
4. Clic en **Crear**

### El trabajador accede desde su celular

- **URL:** https://clickgo.vercel.app/trabajador
- Ingresa su número de teléfono
- Recibe SMS con código
- Ve el mapa con su camión en tiempo real

---

## PARTE 4 — Flujo de prueba completo

```
Admin crea ruta → Admin asigna operador → Admin crea trabajador con parada
       ↓
Operador abre /operador → Se autentica → Activa GPS → Inicia ruta
       ↓
Trabajador abre /trabajador → Se autentica → Ve camión en el mapa
       ↓
Admin ve dashboard con rutas activas y trabajadores conectados
```

---

## PARTE 5 — URLs del sistema

| Rol | URL de acceso |
|---|---|
| Administrador | https://clickgo.vercel.app/admin |
| Operador (chofer) | https://clickgo.vercel.app/operador |
| Trabajador | https://clickgo.vercel.app/trabajador |
| Dashboard admin | https://clickgo.vercel.app/admin/dashboard |
| Gestión de rutas | https://clickgo.vercel.app/admin/rutas |
| Gestión de usuarios | https://clickgo.vercel.app/admin/usuarios |

---

## PARTE 6 — Responsabilidades durante el piloto

| Tarea | Quién |
|---|---|
| Activar Blaze en Firebase | Administrador |
| Habilitar login por teléfono | Administrador |
| Pegar reglas de seguridad | Administrador |
| Crear rutas reales en el sistema | Administrador |
| Crear usuarios reales | Administrador |
| Depurar errores que surjan | Claude Code |
| Ajustar UI según feedback | Claude Code |
| Implementar mejoras durante el piloto | Claude Code |

---

## PARTE 7 — Agente IA para el Administrador

### ¿Qué puede hacer?

#### Consultas en lenguaje natural sobre datos en vivo

| Pregunta del admin | Respuesta del agente |
|---|---|
| "¿Qué camiones están activos ahorita?" | Lista rutas transmitiendo GPS en este momento |
| "¿Cuántos trabajadores esperan en Ruta Norte?" | Cuenta presencia en paradas |
| "¿El camión U-03 se está moviendo?" | Revisa última ubicación y velocidad |
| "¿Qué ruta tiene más retraso hoy?" | Compara ETA estimado vs hora actual |
| "¿Cuántos trabajadores entraron hoy?" | Consulta historial del día |

#### Alertas proactivas — el agente avisa sin que preguntes

- "El camión U-02 lleva 8 minutos sin señal GPS"
- "3 trabajadores llevan más de 20 min esperando en parada Blvd. Colosio"
- "La Ruta Sur lleva 15 min de retraso respecto al horario programado"
- "El operador Carlos Mendoza no ha iniciado ruta y ya son las 5:45 am"

#### Gestión por texto

En lugar de navegar entre pantallas, el admin escribe:

- "Crea un usuario trabajador llamado Juan Pérez, teléfono +528441234567, Ruta Norte, parada Villas del Norte"
- "Cambia a María López a la Ruta Este"
- "Desactiva la Ruta Oeste por hoy"
- "Asigna el operador Pedro Ramírez a la Ruta Sur"

#### Reportes y análisis

- "Dame un resumen de la semana" → Genera reporte con rutas activas, puntualidad, trabajadores atendidos
- "¿Qué día tuvimos más problemas este mes?" → Analiza historial de señal perdida
- "¿Cuál es la ruta más puntual?" → Compara tiempos estimados vs reales
- "Exporta el reporte de hoy para mandarlo por WhatsApp"

#### Soporte técnico contextual

- "Un trabajador me dice que no ve su camión" → Diagnostica: ¿logueado? ¿ruta asignada? ¿operador transmitiendo?
- "¿Cómo agrego una nueva parada?" → Da instrucciones paso a paso
- "¿Por qué un trabajador no recibe notificaciones?" → Revisa FCM token

---

### Costo de operación del agente

| Uso | Costo estimado |
|---|---|
| 50 consultas/día | ~$0.10 USD/día |
| Piloto 15 días | ~$1.50 USD total |
| Mes completo uso normal | ~$3–5 USD |

---

### Lo que NO puede hacer (límites honestos)

| Limitación | Por qué |
|---|---|
| No manda WhatsApp por sí solo | Requiere integración con WhatsApp Business API |
| No predice tráfico en tiempo real | Requiere Google Maps API con datos de tráfico |
| No recuerda conversaciones anteriores por defecto | Cada sesión empieza fresca (configurable) |
| No toma decisiones críticas sin confirmar | Siempre pide confirmación antes de borrar datos |

---

### Para activar el agente IA

1. Obtener API key en [console.anthropic.com](https://console.anthropic.com)
2. Agregar la key como variable de entorno en Vercel
3. Claude Code implementa el widget de chat en el dashboard

---

*Documento generado por Claude Code · ClickGo 2026*
