import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
})

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'ClickGo',
  description: 'Plataforma de movilidad coordinada en tiempo real',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSerif.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>{children}</body>
    </html>
  )
}
