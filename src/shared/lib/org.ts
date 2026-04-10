/**
 * Organización por defecto — se configura via variable de entorno.
 * Para un nuevo cliente: añadir NEXT_PUBLIC_ORG_ID en Vercel y redesplegar.
 * Las páginas admin usan usuario.orgId del perfil autenticado (más seguro).
 * Esta constante solo se usa en páginas pre-autenticación (registro/login).
 */
export const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-demo-001'
