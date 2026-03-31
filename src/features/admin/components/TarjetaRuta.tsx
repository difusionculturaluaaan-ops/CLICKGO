'use client'
import type { RutaConUbicacion } from '@/features/admin/hooks/useRutasActivas'

interface TarjetaRutaProps {
  ruta: RutaConUbicacion
}

function BadgeEstado({ ruta }: { ruta: RutaConUbicacion }) {
  const sinSenal = ruta.minutesSinSenal !== null && ruta.minutesSinSenal > 3

  if (ruta.estado !== 'activa') {
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 font-medium">
        {ruta.estado}
      </span>
    )
  }
  if (!ruta.ubicacion?.active || sinSenal) {
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600 font-medium flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Sin señal
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Transmitiendo
    </span>
  )
}

export function TarjetaRuta({ ruta }: TarjetaRutaProps) {
  const tieneAlerta =
    ruta.estado === 'activa' &&
    (!ruta.ubicacion?.active || (ruta.minutesSinSenal ?? 0) > 3)

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
        tieneAlerta
          ? 'border-red-400'
          : ruta.estado === 'activa'
          ? 'border-green-400'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{ruta.nombre}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Turno {ruta.turno}</p>
        </div>
        <BadgeEstado ruta={ruta} />
      </div>

      {ruta.ubicacion?.active && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-gray-800">{ruta.ubicacion.speed}</p>
            <p className="text-xs text-gray-400">km/h</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-gray-800">{ruta.paradas?.length ?? 0}</p>
            <p className="text-xs text-gray-400">paradas</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-gray-800">
              {ruta.minutesSinSenal !== null ? `${ruta.minutesSinSenal}m` : '—'}
            </p>
            <p className="text-xs text-gray-400">últ. señal</p>
          </div>
        </div>
      )}

      {tieneAlerta && (
        <div className="bg-red-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-red-600 text-xs font-medium">
            Sin señal hace {ruta.minutesSinSenal ?? '?'} min — verificar operador
          </p>
        </div>
      )}

      {ruta.estado !== 'activa' && (
        <p className="text-xs text-gray-400 mt-1">Ruta no iniciada</p>
      )}
    </div>
  )
}
