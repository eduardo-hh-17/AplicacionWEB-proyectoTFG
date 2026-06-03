export default function PanelSobreNosotros() {
  const hitos = [
    { año: '2010', texto: 'Fundación del restaurante en San Pedro Sula con recetas familiares de Honduras.' },
    { año: '2015', texto: 'Reconocidos como mejor restaurante hondureño de la región norte.' },
    { año: '2020', texto: 'Renovación digital: pedidos online y menú digital en mesa.' },
    { año: '2025', texto: 'Más de 10 000 clientes satisfechos y 50+ platos auténticos en carta.' },
  ]

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-5">

      {/* ── HERO ─────────────────────────────────────── */}
      <div className="glass-dark relative rounded-2xl overflow-hidden text-white animate-fade-in p-8">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#d4a040,transparent)' }} />
        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#d4a040' }}>
            Nuestra historia
          </p>
          <h1 className="text-3xl font-bold mb-3 animate-slide-up text-gradient-anim">Restaurante Lempira</h1>
          <p className="leading-relaxed max-w-xl animate-slide-up delay-100" style={{ color: '#9adab4' }}>
            Fundado en 2010 con la visión de llevar los auténticos sabores de Honduras a cada mesa.
            Nuestro nombre es un homenaje a la riqueza cultural de nuestro pueblo.
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-5xl opacity-15 select-none hidden md:block animate-float">
          🌴
        </div>
      </div>

      {/* ── DESCRIPCIÓN ─────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-7 animate-slide-up delay-100">
        <p className="leading-7 mb-4" style={{ color: '#1a3a22' }}>
          Desde nuestros inicios, nos hemos comprometido a usar ingredientes frescos y
          locales, preparando cada plato con el cariño y la tradición hondureña. Nuestra
          cocina combina recetas familiares transmitidas por generaciones con técnicas
          modernas para crear experiencias únicas.
        </p>
        <p className="leading-7" style={{ color: '#1a3a22' }}>
          Hoy, Restaurante Lempira es un punto de encuentro donde cada cliente es tratado
          como parte de nuestra familia caribeña.
        </p>
      </div>

      {/* ── MISIÓN / VISIÓN ─────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            icon: '🎯',
            title: 'Misión',
            desc: 'Ofrecer la mejor experiencia gastronómica con sabores auténticos, ingredientes frescos y un servicio que supere siempre las expectativas.',
            delay: 150,
          },
          {
            icon: '🌊',
            title: 'Visión',
            desc: 'Ser el restaurante referente de la gastronomía hondureña, llevando nuestra tradición caribeña a más ciudades y más corazones.',
            delay: 250,
          },
        ].map(item => (
          <div
            key={item.title}
            className="glass-panel rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: `${item.delay}ms` }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: 'rgba(212,160,64,0.12)' }}>
              {item.icon}
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#0a2214' }}>{item.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#3d6a4a' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── CIFRAS ──────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-6 animate-slide-up delay-200">
        <h2 className="font-bold text-center mb-5" style={{ color: '#0a2214' }}>En números</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { num: '15+', label: 'Años de experiencia' },
            { num: '50+', label: 'Platos en carta' },
            { num: '10k+', label: 'Clientes satisfechos' },
          ].map(c => (
            <div key={c.label} className="text-center p-3">
              <p className="text-3xl font-bold" style={{
                background: 'linear-gradient(135deg,#d4a040,#06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{c.num}</p>
              <p className="text-sm mt-1" style={{ color: '#3d6a4a' }}>{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TIMELINE ────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-6 animate-slide-up delay-300">
        <h2 className="font-bold mb-6" style={{ color: '#0a2214' }}>Nuestra trayectoria</h2>
        <div className="space-y-5">
          {hitos.map((h, i) => (
            <div key={h.año} className="flex gap-4 items-start animate-slide-right" style={{ animationDelay: `${300 + i * 80}ms` }}>
              <div className="shrink-0 w-14 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#d4a040,#c47a28)' }}>
                {h.año}
              </div>
              <p className="flex-1 pt-1 text-sm leading-relaxed" style={{ color: '#1a3a22' }}>{h.texto}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
