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
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          GPS en tiempo real · Sin app · 100% web
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
          Tus trabajadores saben<br />
          <span className="text-teal-600">exactamente cuándo llega</span><br />
          su camión
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          ClickGo conecta a conductores y pasajeros en tiempo real. Sin esperas inciertas,
          sin llamadas, sin estrés. Tu flota siempre visible en el mapa.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contacto"
            className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
          >
            Ver demo en vivo →
          </a>
          <a
            href="/trabajador/mapa"
            className="bg-white text-teal-600 border-2 border-teal-200 px-8 py-4 rounded-2xl font-bold text-lg hover:border-teal-400 transition-colors"
          >
            Probar ahora
          </a>
        </div>
        <p className="text-gray-400 text-sm mt-4">Sin tarjeta de crédito · Configuración en 24 hrs</p>
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
            <p className="text-teal-200 text-sm mt-1">pesos/mes por unidad. Sin contratos largos</p>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Tres roles. Un sistema.</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Cada persona tiene su propia interfaz optimizada para su rol.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icono: '🚌',
              titulo: 'El Conductor',
              color: 'bg-blue-50 border-blue-100',
              iconoBg: 'bg-blue-100',
              pasos: [
                'Abre la app en su celular',
                'Toca "Iniciar Ruta"',
                'Su GPS se transmite automáticamente cada 12 segundos',
              ],
            },
            {
              icono: '👷',
              titulo: 'El Trabajador',
              color: 'bg-teal-50 border-teal-100',
              iconoBg: 'bg-teal-100',
              pasos: [
                'Abre ClickGo en su celular',
                'Ve el mapa con el camión en tiempo real',
                'Recibe notificación cuando el camión está a 5 minutos',
              ],
            },
            {
              icono: '📊',
              titulo: 'El Administrador',
              color: 'bg-purple-50 border-purple-100',
              iconoBg: 'bg-purple-100',
              pasos: [
                'Monitorea todas las rutas en el dashboard',
                'Ve reportes de puntualidad por día',
                'Gestiona rutas, paradas y trabajadores',
              ],
            },
          ].map((rol) => (
            <div key={rol.titulo} className={`rounded-2xl border p-6 ${rol.color}`}>
              <div className={`w-12 h-12 ${rol.iconoBg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {rol.icono}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3">{rol.titulo}</h3>
              <ol className="space-y-2">
                {rol.pasos.map((paso, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 mt-0.5">
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
            <h2 className="text-4xl font-black text-gray-900 mb-4">Diseñado para Saltillo</h2>
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
        <h2 className="text-4xl font-black text-gray-900 mb-4">Precio simple y justo</h2>
        <p className="text-gray-500 text-lg mb-12">Sin sorpresas. Sin contratos de un año.</p>
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
          <p className="text-gray-400 text-xs mt-3">Primer mes gratis para nuevos clientes</p>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────────────────────────── */}
      <section id="contacto" className="bg-teal-600 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">¿Listo para el demo?</h2>
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
