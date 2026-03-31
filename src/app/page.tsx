export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-teal-50">
      <main className="text-center px-6">
        <div className="w-16 h-16 bg-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-3xl font-bold">C</span>
        </div>
        <h1 className="text-4xl font-bold text-teal-900 mb-2">ClickGo</h1>
        <p className="text-teal-600 text-lg mb-8">
          Plataforma de movilidad coordinada en tiempo real
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/operador"
            className="px-6 py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 transition-colors"
          >
            Soy Operador
          </a>
          <a
            href="/trabajador"
            className="px-6 py-3 bg-white text-teal-700 border border-teal-700 rounded-xl font-medium hover:bg-teal-50 transition-colors"
          >
            Soy Trabajador
          </a>
          <a
            href="/admin"
            className="px-6 py-3 bg-white text-teal-700 border border-teal-700 rounded-xl font-medium hover:bg-teal-50 transition-colors"
          >
            Panel Admin
          </a>
        </div>
      </main>
    </div>
  )
}
