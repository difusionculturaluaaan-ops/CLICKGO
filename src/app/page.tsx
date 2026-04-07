import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">CG</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">ClickGo</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <a href="#como-funciona" className="hover:text-teal-600 transition-colors">Cómo funciona</a>
          <a href="#clientes" className="hover:text-teal-600 transition-colors">Para quién</a>
          <a href="#precio" className="hover:text-teal-600 transition-colors">Precio</a>
        </div>
        <a
          href="#contacto"
          className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          Solicitar demo
        </a>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Texto */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
              GPS en tiempo real · Sin app · 100% web
            </div>
            <h1 className="text-4xl md:text-5xl text-gray-900 leading-tight mb-5" style={{ fontFamily: 'var(--font-serif)' }}>
              Tus trabajadores saben{' '}
              <span className="text-teal-600">exactamente cuándo llega</span>{' '}
              su camión
            </h1>
            <p className="text-lg text-gray-500 mb-8">
              ClickGo conecta conductores y pasajeros en tiempo real. Sin esperas inciertas,
              sin llamadas, sin estrés. Tu flota siempre visible en el mapa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#contacto"
                className="bg-teal-600 text-white px-7 py-3.5 rounded-2xl font-bold text-base hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
              >
                Ver demo en vivo →
              </a>
              <a
                href="/trabajador/mapa"
                className="bg-white text-teal-600 border-2 border-teal-200 px-7 py-3.5 rounded-2xl font-bold text-base hover:border-teal-400 transition-colors"
              >
                Probar ahora
              </a>
            </div>
            <p className="text-gray-400 text-sm mt-4">Sin tarjeta de crédito · 15 días de prueba gratis</p>
          </div>

          {/* Mockup celular */}
          <div className="shrink-0 w-56 md:w-64">
            <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl ring-4 ring-gray-800">
              {/* Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-800 rounded-full z-10" />
              {/* Pantalla */}
              <div className="bg-gray-800 rounded-4xl overflow-hidden" style={{ height: '480px' }}>
                {/* Header app */}
                <div className="bg-gray-900 px-3 pt-8 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-xs">ClickGo</p>
                    <p className="text-gray-400 text-xs">María López</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                {/* Mapa simulado */}
                <div className="relative bg-stone-200 mx-2 rounded-xl overflow-hidden" style={{ height: '220px' }}>
                  {/* Calles */}
                  <div className="absolute inset-0 opacity-60">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                    <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-white" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-amber-400" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400" />
                  </div>
                  {/* Marcador camión */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-amber-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <span className="text-xs">🚌</span>
                    </div>
                  </div>
                  {/* Marcador parada */}
                  <div className="absolute bottom-6 right-8">
                    <div className="w-4 h-4 bg-teal-600 rounded-full border-2 border-white shadow" />
                    <p className="text-xs text-teal-800 font-bold mt-0.5 whitespace-nowrap">Tu parada</p>
                  </div>
                </div>
                {/* Panel ETA */}
                <div className="mx-2 mt-2 bg-yellow-500 rounded-xl p-2.5 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-white font-bold text-xs">¡Ya viene!</p>
                    <p className="text-yellow-100 text-xs">A menos de 5 minutos</p>
                  </div>
                </div>
                {/* Info */}
                <div className="mx-2 mt-2 bg-gray-700 rounded-xl p-2.5 flex justify-between items-center">
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">4</p>
                    <p className="text-gray-400 text-xs">min</p>
                  </div>
                  <div className="w-px h-6 bg-gray-600" />
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">850m</p>
                    <p className="text-gray-400 text-xs">distancia</p>
                  </div>
                  <div className="w-px h-6 bg-gray-600" />
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">38</p>
                    <p className="text-gray-400 text-xs">km/h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MÉTRICAS ─────────────────────────────────────────────────────── */}
      <section className="bg-teal-600 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center text-white">
          <div>
            <p className="text-4xl font-black">15-20</p>
            <p className="text-teal-200 text-sm mt-1">minutos perdidos esperando por trabajador/día</p>
          </div>
          <div>
            <p className="text-4xl font-black">&lt;5s</p>
            <p className="text-teal-200 text-sm mt-1">de latencia en la actualización del mapa</p>
          </div>
          <div>
            <p className="text-4xl font-black">$500</p>
            <p className="text-teal-200 text-sm mt-1">pesos/mes por unidad. Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl text-gray-900 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Tres roles. Un sistema.</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Cada persona tiene su propia interfaz optimizada para su rol.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              foto: '/OPERADOR CIRC.png',
              titulo: 'El Conductor',
              subtitulo: 'Operador de ruta',
              color: 'bg-blue-50 border-blue-100',
              numColor: 'bg-blue-100 text-blue-500',
              pasos: [
                'Abre la app en su celular',
                'Toca "Iniciar Ruta"',
                'Su GPS se transmite automáticamente cada 12 segundos',
              ],
            },
            {
              foto: '/TRABAJADORES CIRC.png',
              titulo: 'El Trabajador',
              subtitulo: 'Personal de planta',
              color: 'bg-teal-50 border-teal-100',
              numColor: 'bg-teal-100 text-teal-600',
              pasos: [
                'Abre ClickGo en su celular',
                'Ve el mapa con el camión en tiempo real',
                'Recibe notificación cuando el camión está a 5 minutos',
              ],
            },
            {
              foto: '/ADMIN CIRC.png',
              titulo: 'El Administrador',
              subtitulo: 'Gestión de flota',
              color: 'bg-purple-50 border-purple-100',
              numColor: 'bg-purple-100 text-purple-500',
              pasos: [
                'Monitorea todas las rutas en el dashboard',
                'Ve reportes de puntualidad por día',
                'Gestiona rutas, paradas y trabajadores',
              ],
            },
          ].map((rol) => (
            <div key={rol.titulo} className="p-6 flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full overflow-hidden mb-4">
                <Image
                  src={rol.foto}
                  alt={rol.titulo}
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{rol.titulo}</h3>
              <p className="text-gray-400 text-xs mb-4">{rol.subtitulo}</p>
              <ol className="space-y-2 text-left w-full">
                {rol.pasos.map((paso, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className={`w-5 h-5 ${rol.numColor} rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                      {i + 1}
                    </span>
                    {paso}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── PARA QUIÉN ───────────────────────────────────────────────────── */}
      <section id="clientes" className="bg-gray-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Diseñado para Saltillo</h2>
            <p className="text-gray-500 text-lg">y cualquier organización con transporte propio</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icono: '🏭',
                titulo: 'Maquiladoras',
                desc: 'Trabajadores de turno matutino y vespertino que esperan el camión en colonias distantes de Ciudad Industrial. Con ClickGo saben exactamente cuándo salir de casa.',
                tag: 'Caso principal',
                tagColor: 'bg-teal-100 text-teal-700',
              },
              {
                icono: '🎓',
                titulo: 'Universidades',
                desc: 'Rutas fijas de camión universitario como el BUITRE de la UAAAN. Estudiantes con mapa en tiempo real en lugar de esperar sin información en la parada.',
                tag: 'En evaluación',
                tagColor: 'bg-blue-100 text-blue-700',
              },
              {
                icono: '🏢',
                titulo: 'Empresas medianas',
                desc: 'Cualquier empresa con transporte de personal entre puntos fijos. Reduce llamadas al conductor y quejas de trabajadores retrasados.',
                tag: 'Compatible',
                tagColor: 'bg-gray-200 text-gray-600',
              },
              {
                icono: '🏫',
                titulo: 'Colegios',
                desc: 'Padres de familia que quieren saber en qué punto de la ruta va el camión escolar. Menos ansiedad, más tranquilidad.',
                tag: 'Compatible',
                tagColor: 'bg-gray-200 text-gray-600',
              },
            ].map((item) => (
              <div key={item.titulo} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{item.icono}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.tagColor}`}>{item.tag}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIO ───────────────────────────────────────────────────────── */}
      <section id="precio" className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl text-gray-900 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Precio simple y justo</h2>
        <p className="text-gray-500 text-lg mb-12">Sin sorpresas. Cancela cuando quieras.</p>
        <div className="max-w-sm mx-auto bg-white border-2 border-teal-200 rounded-3xl p-8 shadow-xl shadow-teal-50">
          <p className="text-gray-500 text-sm font-medium mb-2">Por unidad / por mes</p>
          <div className="flex items-end justify-center gap-1 mb-2">
            <span className="text-6xl font-black text-gray-900">$500</span>
            <span className="text-gray-400 text-lg mb-2">MXN</span>
          </div>
          <p className="text-gray-400 text-sm mb-8">≈ $25 USD · Sin IVA</p>
          <ul className="text-left space-y-3 mb-8">
            {[
              'GPS en tiempo real para todos los trabajadores',
              'App conductor + trabajador + admin',
              'Notificaciones push ilimitadas',
              'Reportes de puntualidad',
              'Soporte por WhatsApp',
              'Sin límite de usuarios por ruta',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-teal-500 font-bold">✓</span>
                {feat}
              </li>
            ))}
          </ul>
          <a
            href="#contacto"
            className="block w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-teal-700 transition-colors"
          >
            Empezar ahora
          </a>
          <p className="text-gray-400 text-xs mt-3">15 días de prueba gratis para nuevos clientes</p>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────────────────────────── */}
      <section id="contacto" className="bg-teal-600 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl text-white mb-4" style={{ fontFamily: 'var(--font-serif)' }}>¿Listo para el demo?</h2>
          <p className="text-teal-100 text-lg mb-10">
            Te mostramos ClickGo funcionando con tus rutas reales en menos de 30 minutos.
          </p>
          <div className="bg-white rounded-3xl p-8 space-y-4 text-left">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Juan García"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Empresa</label>
                <input
                  type="text"
                  placeholder="Maquiladora ACME"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">WhatsApp</label>
              <input
                type="tel"
                placeholder="+52 844 123 4567"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">¿Cuántas unidades tiene?</label>
              <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>1-3 unidades</option>
                <option>4-10 unidades</option>
                <option>11-30 unidades</option>
                <option>Más de 30</option>
              </select>
            </div>
            <a
              href="https://wa.me/528441186348?text=Hola%2C%20quiero%20una%20demo%20de%20ClickGo"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg text-center hover:bg-teal-700 transition-colors"
            >
              Enviar por WhatsApp →
            </a>
            <p className="text-gray-400 text-xs text-center">Respondemos en menos de 2 horas en horario laboral</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">CG</span>
            </div>
            <span className="text-white font-bold">ClickGo</span>
          </div>
          <p className="text-sm">Saltillo, Coahuila · México</p>
          <div className="flex gap-6 text-sm">
            <a href="/trabajador/mapa" className="hover:text-white transition-colors">Demo trabajador</a>
            <a href="/admin" className="hover:text-white transition-colors">Panel admin</a>
            <a href="/operador" className="hover:text-white transition-colors">App operador</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
