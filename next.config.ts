import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack (default en Next.js 16) — sin config webpack
  // Leaflet requiere dynamic import con ssr: false en los componentes que lo usen
  turbopack: {},
}

export default nextConfig
