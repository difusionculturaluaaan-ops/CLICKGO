'use client'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard',  icon: '🏠', label: 'Inicio'      },
  { href: '/admin/rutas',      icon: '🗺️',  label: 'Rutas'       },
  { href: '/admin/usuarios',   icon: '👥',  label: 'Usuarios'    },
  { href: '/admin/simulador',  icon: '🎬',  label: 'Simulador'   },
  { href: '/admin/reportes',   icon: '📊',  label: 'Reportes'    },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Solo mostrar nav en páginas internas (no en el login /admin)
  const mostrarNav = pathname !== '/admin'

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-16">
        {children}
      </div>

      {mostrarNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-2xl mx-auto flex">
            {NAV.map(({ href, icon, label }) => {
              const activo = pathname === href
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                    activo ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-xl leading-none">{icon}</span>
                  <span className={`text-xs font-medium ${activo ? 'text-teal-600' : ''}`}>
                    {label}
                  </span>
                  {activo && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
