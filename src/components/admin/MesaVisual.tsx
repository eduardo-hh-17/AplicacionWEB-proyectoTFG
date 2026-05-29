type Props = {
  numero: number
  capacidad: number
  personas: number
  estado: 'libre' | 'ocupada' | 'esperando'
  onClick: () => void
}

export default function MesaVisual({ numero, capacidad, personas, estado, onClick }: Props) {
  const color = estado === 'ocupada' ? '#ef4444' : '#22c55e'
  const personasReales = estado === 'libre' ? 0 : personas

  const sillas = Array.from({ length: capacidad }, (_, i) => {
    const angulo = (i * 360) / capacidad - 90
    const rad = (angulo * Math.PI) / 180
    const radio = 52
    return {
      x: 80 + radio * Math.cos(rad),
      y: 80 + radio * Math.sin(rad),
      ocupada: i < personasReales
    }
  })

  return (
    <button onClick={onClick} className="hover:scale-105 transition-transform">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <filter id={`blur-${numero}`}>
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Halo difuminado */}
        <circle cx="80" cy="80" r="70" fill={color} opacity="0.15" filter={`url(#blur-${numero})`} />

        {/* Sillas */}
        {sillas.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r="10"
            fill={s.ocupada ? color : '#e2e8f0'}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Mesa redonda */}
        <circle cx="80" cy="80" r="32" fill="white" stroke={color} strokeWidth="3" />

        {/* Mesa X en el centro — grande y llamativo */}
        <text x="80" y="74" textAnchor="middle" fontSize="11" fill="#0d1f3c" fontWeight="800">
        MESA {numero}
        </text>

        {/* Capacidad máxima — más pequeña debajo */}
        <text x="80" y="91" textAnchor="middle" fontSize="14" fill={color} fontWeight="600">
        {capacidad} máx
        </text>
      </svg>
    </button>
  )
}