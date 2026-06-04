'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import HorarioInput from '@/components/ui/HorarioInput'
import { addHoras, HORA_CIERRE_ENTRADA, HORA_CIERRE_SALIDA } from '@/lib/horario'

/* ─── Types ─── */
type TipoEvento = 'standard' | 'cumpleanos' | 'pedida' | 'evento' | 'empresa'
type Mesa = { id: number; numero: number; capacidad: number; estado: string }
type ReservaDia = { id: string; hora: string; duracion_horas: number; personas: number; mesa_id: number | null }

/* ─── Event type config ─── */
const TIPO: Record<TipoEvento, { label: string; color: string; bg: string; border: string; icon: string }> = {
  standard:   { label: 'Reserva estándar', color: '#166534', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.35)',  icon: '🍽️' },
  cumpleanos: { label: 'Cumpleaños',       color: '#92400e', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.40)', icon: '🎂' },
  pedida:     { label: 'Pedida de mano',   color: '#9d174d', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.35)', icon: '💍' },
  evento:     { label: 'Evento especial',  color: '#4c1d95', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.35)', icon: '🎉' },
  empresa:    { label: 'Reunión empresa',  color: '#1e3a5f', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.35)', icon: '🏢' },
}

/* ─── Calendar constants ─── */
const MESES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEM = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const H0 = 11
const H1 = 24
const PX = 52
const HORAS_DET = Array.from({length:(H1-H0)*2+1}, (_,i) => {
  const h = H0 + i*0.5
  return `${String(Math.floor(h)).padStart(2,'0')}:${h%1===0?'00':'30'}`
})

/* ─── Helpers ─── */
const parseH  = (s: string) => { const [h,m] = s.split(':').map(Number); return h + m/60 }
const isoDate = (d: Date)   => d.toISOString().split('T')[0]
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r }
const monday  = (d: Date)   => { const day = d.getDay(); return addDays(d, day===0?-6:1-day) }
const addHorasStr = (base: string, h: number) => {
  const t = parseH(base)+h; const hh = Math.floor(t); const mm = Math.round((t-hh)*60)
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

/** Returns true if a reservation with [ini, ini+dur) covers the point `horaT` */
const tablaOcupadaEn = (r: ReservaDia, horaT: number) => {
  const ini = parseH(r.hora.slice(0,5))
  const fin = ini + (r.duracion_horas ?? 1.5)
  return ini <= horaT && horaT < fin
}

/* ══════════════════════════════════════════ */
export default function PanelReservas() {
  /* ── Form state ── */
  const [nombre,      setNombre]      = useState('')
  const [apellido,    setApellido]    = useState('')
  const [email,       setEmail]       = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [fecha,       setFecha]       = useState('')
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSalida,  setHoraSalida]  = useState('')
  const [personas,    setPersonas]    = useState(1)
  const [tipoEvento,  setTipoEvento]  = useState<TipoEvento>('standard')
  const [notas,       setNotas]       = useState('')
  const [enviado,     setEnviado]     = useState(false)
  const [enviando,    setEnviando]    = useState(false)

  /* ── Calendar state ── */
  const [vista,        setVista]        = useState<'semana'|'mes'>('semana')
  const [refDate,      setRefDate]      = useState(new Date())
  const [slotsMap,     setSlotsMap]     = useState<Record<string, {hora:string; duracion_horas:number}[]>>({})
  const [diaDetalle,   setDiaDetalle]   = useState<string|null>(null)
  const [horaDetalle,  setHoraDetalle]  = useState<string|null>(null)
  const [reservasDia,  setReservasDia]  = useState<ReservaDia[]>([])
  const [mesas,        setMesas]        = useState<Mesa[]>([])
  const [reloadKey,    setReloadKey]    = useState(0)

  const hoy = isoDate(new Date())
  const año = refDate.getFullYear()
  const mes = refDate.getMonth()

  /* ── Load mesas once ── */
  useEffect(() => {
    supabase.from('mesas').select('id, numero, capacidad, estado').order('numero')
      .then(({ data }) => { if (data) setMesas(data as Mesa[]) })
  }, [])

  /* ── Tiempo real: recargar cuando cambie cualquier reserva ── */
  useEffect(() => {
    const ch = supabase.channel('reservas-cliente-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        setReloadKey(k => k + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  /* ── Load slots for calendar overview ── */
  useEffect(() => {
    let desde: string, hasta: string
    if (vista === 'semana') {
      const lun = monday(refDate)
      desde = isoDate(lun); hasta = isoDate(addDays(lun, 6))
    } else {
      const dias = new Date(año, mes+1, 0).getDate()
      desde = `${año}-${String(mes+1).padStart(2,'0')}-01`
      hasta = `${año}-${String(mes+1).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    }
    supabase.from('reservas').select('fecha, hora, duracion_horas')
      .eq('estado','confirmada').gte('fecha',desde).lte('fecha',hasta)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, {hora:string; duracion_horas:number}[]> = {}
        data.forEach(r => {
          ;(map[r.fecha] ??= []).push({ hora: r.hora.slice(0,5), duracion_horas: r.duracion_horas ?? 1.5 })
        })
        setSlotsMap(map)
      })
  }, [refDate, vista, año, mes, reloadKey])

  /* ── Load reservations detail when day is selected (or on realtime reload) ── */
  useEffect(() => {
    if (!diaDetalle) { setReservasDia([]); setHoraDetalle(null); return }
    supabase.from('reservas')
      .select('id,hora,duracion_horas,personas,mesa_id')
      .eq('fecha', diaDetalle).eq('estado', 'confirmada')
      .then(({ data }) => setReservasDia((data ?? []) as ReservaDia[]))
  }, [diaDetalle, reloadKey])

  /* ── Compute occupied mesa IDs for selected hour ── */
  const mesasOcupadasIds = useMemo<Set<number>>(() => {
    if (!horaDetalle) return new Set<number>()
    const horaT = parseH(horaDetalle)
    return new Set<number>(
      reservasDia
        .filter(r => r.mesa_id && tablaOcupadaEn(r, horaT))
        .map(r => r.mesa_id as number)
    )
  }, [reservasDia, horaDetalle])

  /* ── Duration validation ── */
  const durInfo = useMemo(() => {
    if (!horaEntrada || !horaSalida) return { dur: 0, ok: false, msg: '' }
    const dur = parseH(horaSalida) - parseH(horaEntrada)
    if (dur <= 0) return { dur, ok: false, msg: 'La hora de salida debe ser posterior.' }
    if (dur < 1)  return { dur, ok: false, msg: 'Duración mínima: 1 hora.' }
    if (dur > 3)  return { dur, ok: false, msg: 'Duración máxima: 3 horas.' }
    return { dur, ok: true, msg: '' }
  }, [horaEntrada, horaSalida])

  const onHoraEntradaChange = (v: string) => {
    setHoraEntrada(v); if (v) setHoraSalida(addHoras(v, 1.5))
  }

  /* ── Calendar nav ── */
  const nav = (d: -1|1) => setRefDate(prev => {
    const n = new Date(prev)
    if (vista==='semana') n.setDate(n.getDate()+d*7)
    else n.setMonth(n.getMonth()+d)
    return n
  })
  const navLabel = () => {
    if (vista==='semana') {
      const lun = monday(refDate); const dom = addDays(lun,6)
      return `${lun.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${dom.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`
    }
    return `${MESES[mes]} ${año}`
  }

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre||!telefono||!fecha||!horaEntrada||!horaSalida||!durInfo.ok) return
    setEnviando(true)
    await supabase.from('reservas').insert({
      nombre:nombre.trim(), apellido:apellido.trim(),
      email:email.trim()||null, telefono:telefono.trim(),
      personas, fecha, hora:horaEntrada, estado:'pendiente',
      tipo_evento:tipoEvento, duracion_horas:durInfo.dur, notas:notas.trim()||null,
    })
    setEnviando(false); setEnviado(true)
    setNombre(''); setApellido(''); setEmail(''); setTelefono('')
    setFecha(''); setHoraEntrada(''); setHoraSalida('')
    setPersonas(1); setTipoEvento('standard'); setNotas('')
    setTimeout(() => setEnviado(false), 6000)
  }

  /* ─── SEMANA VIEW ─── */
  const renderSemana = () => {
    const lun = monday(refDate)
    const dates = Array.from({length:7}, (_,i) => isoDate(addDays(lun,i)))
    const rows  = Array.from({length: H1-H0}, (_,i) => H0+i)
    return (
      <div className="overflow-x-auto overflow-y-hidden rounded-2xl" style={{border:'1px solid rgba(45,112,60,0.18)'}}>
        <div className="flex min-w-[520px]" style={{minHeight:`${(H1-H0)*PX+36}px`}}>
          <div className="shrink-0 w-12 flex flex-col" style={{borderRight:'1px solid rgba(45,112,60,0.12)'}}>
            <div style={{height:36, borderBottom:'1px solid rgba(45,112,60,0.12)'}}/>
            {rows.map(h=>(
              <div key={h} className="shrink-0 flex items-start justify-end pr-1.5"
                style={{height:PX, borderBottom:'1px solid rgba(45,112,60,0.07)'}}>
                <span className="text-[10px] mt-1 leading-none" style={{color:'#5a8a6a'}}>{String(h).padStart(2,'0')}h</span>
              </div>
            ))}
          </div>
          {dates.map(iso=>{
            const isToday = iso===hoy; const isPast = iso<hoy
            const d = new Date(iso+'T12:00')
            const info = slotsMap[iso]
            const sel = iso===diaDetalle
            return (
              <div key={iso} className="flex-1 flex flex-col min-w-[60px]"
                style={{borderRight:'1px solid rgba(45,112,60,0.08)', opacity:isPast?0.4:1}}>
                <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
                  style={{height:36, background:sel?'rgba(212,160,64,0.18)':isToday?'rgba(212,160,64,0.10)':'rgba(45,112,60,0.04)',
                    borderBottom:'1px solid rgba(45,112,60,0.12)',
                    outline: sel?'2px solid rgba(212,160,64,0.5)':'none'}}
                  onClick={()=>!isPast&&setDiaDetalle(iso===diaDetalle?null:iso)}>
                  <span className="text-[10px] font-semibold capitalize" style={{color:isToday||sel?'#d4a040':'#3d6a4a'}}>
                    {d.toLocaleDateString('es-ES',{weekday:'short'})}
                  </span>
                  <span className={`text-[12px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday?'bg-amber-400 text-black':'text-[#1a3a22]'}`}>{d.getDate()}</span>
                </div>
                <div className="relative flex-1 cursor-pointer" style={{height:(H1-H0)*PX}}
                  onClick={()=>!isPast&&setDiaDetalle(iso===diaDetalle?null:iso)}>
                  {rows.map(h=>(
                    <div key={h} className="absolute w-full"
                      style={{top:(h-H0)*PX, height:PX, borderTop:`1px solid rgba(45,112,60,${h%2===0?'0.08':'0.04'})`}}/>
                  ))}
                  {(slotsMap[iso]??[]).map((s, si) => {
                    const startH = parseH(s.hora)
                    const dur    = s.duracion_horas ?? 1.5
                    const top    = (startH - H0) * PX
                    const height = Math.max(dur * PX - 2, 18)
                    return (
                      <div key={si} className="absolute left-0.5 right-0.5 rounded-md flex flex-col items-start justify-start px-1 py-0.5 overflow-hidden"
                        style={{top, height, background:'rgba(239,68,68,0.18)', border:'1.5px solid rgba(239,68,68,0.45)'}}>
                        <span className="text-[9px] font-bold leading-tight" style={{color:'#f87171'}}>{s.hora}</span>
                        {height > 26 && <span className="text-[9px] leading-none opacity-70" style={{color:'#fca5a5'}}>Ocupado</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── MES VIEW ─── */
  const renderMes = () => {
    const offset = (() => { const d = new Date(año,mes,1).getDay(); return d===0?6:d-1 })()
    const dias   = new Date(año,mes+1,0).getDate()
    const toI    = (d:number) => `${año}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return (
      <div className="rounded-2xl overflow-hidden" style={{border:'1px solid rgba(45,112,60,0.18)'}}>
        <div className="grid grid-cols-7" style={{borderBottom:'1px solid rgba(45,112,60,0.12)'}}>
          {DIAS_SEM.map(d=>(
            <div key={d} className="text-center py-2 text-[11px] font-semibold" style={{color:'#5a8a6a'}}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({length:offset}).map((_,i)=>(
            <div key={`e${i}`} style={{minHeight:52, borderRight:'1px solid rgba(45,112,60,0.06)', borderBottom:'1px solid rgba(45,112,60,0.06)'}}/>
          ))}
          {Array.from({length:dias}).map((_,i)=>{
            const d = i+1; const iso = toI(d)
            const slots = slotsMap[iso] ?? []; const isToday = iso===hoy; const isPast = iso<hoy
            const sel = iso===diaDetalle
            return (
              <div key={d} className="relative p-1 cursor-pointer transition-all"
                style={{minHeight:52, border:'1px solid rgba(45,112,60,0.06)',
                  background:sel?'rgba(212,160,64,0.10)':isToday?'rgba(45,138,68,0.08)':undefined,
                  opacity:isPast?0.5:1}}
                onClick={()=>!isPast&&setDiaDetalle(iso===diaDetalle?null:iso)}>
                <span className={`text-[12px] font-bold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${isToday?'bg-amber-400 text-black':'text-[#1a3a22]'}`}>{d}</span>
                {slots.length > 0 && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{background:'rgba(239,68,68,0.15)', color:'#ef4444'}}>
                    {slots.length} res.
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── DÍA DETALLE con mesas ─── */
  const renderDiaDetalle = () => {
    if (!diaDetalle) return null
    const d = new Date(diaDetalle+'T12:00')
    const mesasActivas = mesas.filter(m => m.estado !== 'inactiva')

    return (
      <div className="rounded-2xl overflow-hidden animate-slide-up" style={{border:'1px solid rgba(45,112,60,0.20)'}}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{background:'rgba(45,112,60,0.07)', borderBottom:'1px solid rgba(45,112,60,0.12)'}}>
          <div>
            <p className="font-semibold text-[14px] capitalize" style={{color:'#0a2214'}}>
              {d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
            </p>
            <p className="text-xs mt-0.5" style={{color:'#5a8a6a'}}>
              {reservasDia.length === 0
                ? '✅ Sin reservas — todas las mesas libres'
                : `${reservasDia.length} reserva${reservasDia.length!==1?'s':''} confirmadas`}
            </p>
          </div>
          <button onClick={()=>setDiaDetalle(null)} className="text-lg w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{color:'#5a8a6a'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.06)'}}
            onMouseLeave={e=>{e.currentTarget.style.background=''}}>✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Selector de hora */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{color:'#1a3a22'}}>
              Elige una hora para ver las mesas disponibles:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {HORAS_DET.map(h => {
                const horaT = parseH(h)
                // count occupied tables at this hour
                const ocupCount = reservasDia.filter(r => r.mesa_id && tablaOcupadaEn(r, horaT)).length
                const sel = horaDetalle === h
                return (
                  <button key={h} onClick={()=>setHoraDetalle(h===horaDetalle?null:h)}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={sel
                      ? {background:'linear-gradient(135deg,#1a5c28,#2d8a44)', color:'#fff', boxShadow:'0 2px 8px rgba(30,92,46,0.35)'}
                      : ocupCount > 0
                        ? {background:'rgba(239,68,68,0.10)', color:'#b91c1c', border:'1px solid rgba(239,68,68,0.30)'}
                        : {background:'rgba(45,112,60,0.08)', color:'#3d6a4a', border:'1px solid rgba(45,112,60,0.18)'}
                    }>
                    {h}
                    {ocupCount > 0 && !sel && (
                      <span className="ml-1 text-[9px] opacity-70">({ocupCount})</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grid de mesas para la hora seleccionada */}
          {horaDetalle && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{color:'#1a3a22'}}>
                Mesas a las <span className="font-black">{horaDetalle}</span>:
              </p>

              {mesas.length === 0 ? (
                <p className="text-xs" style={{color:'#5a8a6a'}}>No hay mesas configuradas aún.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {mesas.map(m => {
                    const ocupada = mesasOcupadasIds.has(m.id)
                    return (
                      <div key={m.id}
                        className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all"
                        style={ocupada
                          ? {background:'rgba(239,68,68,0.12)', border:'2px solid rgba(239,68,68,0.45)'}
                          : {background:'rgba(34,197,94,0.10)', border:'2px solid rgba(34,197,94,0.35)'}
                        }>
                        {/* Mesa icon */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                          style={{
                            background: ocupada ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)',
                            color: ocupada ? '#ef4444' : '#16a34a',
                          }}>
                          {m.numero}
                        </div>
                        {/* Capacidad */}
                        <span className="text-[11px] font-semibold" style={{color: ocupada?'#b91c1c':'#166534'}}>
                          {m.capacidad} pers.
                        </span>
                        {/* Estado */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: ocupada ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                            color: ocupada ? '#ef4444' : '#16a34a',
                          }}>
                          {ocupada ? '🔴 Ocupada' : '🟢 Libre'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Resumen + mensaje mesas disponibles */}
              {(() => {
                const libres = mesas.filter(m => !mesasOcupadasIds.has(m.id) && m.estado !== 'inactiva')
                return (
                  <div className="mt-3 pt-3 space-y-2" style={{borderTop:'1px solid rgba(45,112,60,0.10)'}}>
                    {libres.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm"
                        style={{background:'rgba(239,68,68,0.12)', border:'1.5px solid rgba(239,68,68,0.35)', color:'#b91c1c'}}>
                        🚫 Sin mesas disponibles para esta hora
                      </div>
                    ) : (
                      <>
                        <p className="text-[12px] font-semibold" style={{color:'#1a3a22'}}>
                          Mesas libres a las <strong>{horaDetalle}</strong>:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {libres
                            .sort((a,b) => a.numero - b.numero)
                            .map(m => (
                              <span key={m.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                                style={{background:'rgba(34,197,94,0.12)', color:'#166534', border:'1px solid rgba(34,197,94,0.35)'}}>
                                🪑 Mesa {m.numero} · {m.capacidad} pers.
                              </span>
                            ))}
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-4">
                      <span className="text-[11px]" style={{color:'#5a8a6a'}}>
                        {libres.length} libres · {mesasOcupadasIds.size} ocupadas · {libres.reduce((s,m)=>s+m.capacidad,0)} plazas totales disponibles
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">

      {/* CABECERA */}
      <div className="animate-slide-up">
        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{color:'#d4a040'}}>Mesa para ti</p>
        <h1 className="text-2xl font-bold text-gradient-anim">Reservar mesa</h1>
        <p className="text-sm mt-1" style={{color:'#7aaa82'}}>Consulta disponibilidad y solicita tu reserva.</p>
      </div>

      {/* SUCCESS */}
      {enviado && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl animate-scale-in"
          style={{background:'rgba(45,144,80,0.2)', border:'1px solid rgba(45,144,80,0.4)', color:'#9adab4'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
          </svg>
          <span className="text-sm font-medium">¡Solicitud enviada! El restaurante te confirmará pronto.</span>
        </div>
      )}

      {/* ─── DISPONIBILIDAD ─── */}
      <div className="glass-panel overflow-hidden animate-slide-up delay-100">
        {/* Header cal */}
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid rgba(45,112,60,0.12)'}}>
          <div>
            <p className="font-semibold text-[15px]" style={{color:'#0a2214'}}>Disponibilidad de mesas</p>
            <p className="text-xs mt-0.5" style={{color:'#5a8a6a'}}>Pulsa un día para ver las mesas disponibles por hora</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{border:'1px solid rgba(45,112,60,0.2)'}}>
              {(['semana','mes'] as const).map(v=>(
                <button key={v} onClick={()=>setVista(v)} className="px-2.5 py-1 text-xs font-semibold transition-all capitalize"
                  style={vista===v ? {background:'rgba(45,112,60,0.18)',color:'#1a5c28'} : {color:'#5a8a6a'}}>
                  {v==='semana'?'Semana':'Mes'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={()=>nav(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-lg transition-colors" style={{color:'#3d6a4a'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.05)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=''}}>‹</button>
              <span className="text-[12px] font-semibold px-1 min-w-[110px] text-center" style={{color:'#0a2214'}}>{navLabel()}</span>
              <button onClick={()=>nav(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-lg transition-colors" style={{color:'#3d6a4a'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.05)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=''}}>›</button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {vista==='semana' ? renderSemana() : renderMes()}
          {renderDiaDetalle()}
        </div>
      </div>

      {/* ─── FORMULARIO ─── */}
      <div className="glass-panel overflow-hidden animate-slide-up delay-150">
        <div className="px-4 sm:px-6 py-4" style={{borderBottom:'1px solid rgba(45,112,60,0.15)'}}>
          <p className="font-semibold text-[15px]" style={{color:'#0a2214'}}>Datos de la reserva</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">

          {/* TIPO EVENTO */}
          <div>
            <label className="block mb-2 text-[13px] font-semibold" style={{color:'#1a3a22'}}>¿Qué tipo de ocasión es?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(TIPO) as [TipoEvento, typeof TIPO[TipoEvento]][]).map(([k,v])=>(
                <button key={k} type="button" onClick={()=>setTipoEvento(k)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left"
                  style={tipoEvento===k
                    ? {background:v.bg, border:`2px solid ${v.border}`, color:v.color, fontWeight:700}
                    : {background:'rgba(45,112,60,0.04)', border:'1.5px solid rgba(45,112,60,0.15)', color:'#3d6a4a'}}>
                  <span className="text-xl leading-none shrink-0">{v.icon}</span>
                  <span className="leading-tight">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NOMBRE + APELLIDO */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Nombre *</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ana" className="input-modern" required/>
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Apellido</label>
              <input value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="García" className="input-modern"/>
            </div>
          </div>

          {/* EMAIL + TELÉFONO */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>
                Correo <span className="font-normal text-[12px]" style={{color:'#5a8a6a'}}>(para confirmar)</span>
              </label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ana@email.com" className="input-modern"/>
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Teléfono *</label>
              <input type="tel" value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="+504 XXXX-XXXX" className="input-modern" required/>
            </div>
          </div>

          {/* FECHA */}
          <div>
            <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Fecha *</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="input-modern" required min={hoy}/>
          </div>

          {/* HORARIO */}
          <div>
            <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Horario *</label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <p className="text-[11px] mb-1" style={{color:'#5a8a6a'}}>Hora de llegada</p>
                <HorarioInput
                  value={horaEntrada}
                  onChange={onHoraEntradaChange}
                  tema="cliente"
                  maxHora={HORA_CIERRE_ENTRADA}
                />
              </div>
              <span className="text-[#5a8a6a] text-xl mb-2 pb-5">→</span>
              <div className="flex-1">
                <p className="text-[11px] mb-1" style={{color:'#5a8a6a'}}>Hora de salida</p>
                <HorarioInput
                  value={horaSalida}
                  onChange={setHoraSalida}
                  tema="cliente"
                  minHora={horaEntrada}
                  maxHora={HORA_CIERRE_SALIDA}
                />
              </div>
            </div>
            <div className="mt-2 min-h-[24px]">
              {horaEntrada && horaSalida && (
                durInfo.ok
                  ? <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                      style={{background:'rgba(34,197,94,0.10)', color:'#166534', border:'1px solid rgba(34,197,94,0.3)'}}>
                      ✓ {Math.floor(durInfo.dur)}h{durInfo.dur%1!==0?` ${Math.round((durInfo.dur%1)*60)}min`:''}
                    </span>
                  : <span className="text-[12px] px-2.5 py-1 rounded-full"
                      style={{background:'rgba(239,68,68,0.08)', color:'#b91c1c', border:'1px solid rgba(239,68,68,0.25)'}}>
                      ⚠️ {durInfo.msg}
                    </span>
              )}
            </div>
          </div>

          {/* PERSONAS */}
          <div>
            <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>Número de personas</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setPersonas(p=>Math.max(1,p-1))}
                className="input-modern" style={{width:36,height:36,padding:0,textAlign:'center',fontWeight:'bold',flexShrink:0}}>−</button>
              <span className="flex-1 text-center font-semibold text-lg" style={{color:'#0a2214'}}>{personas}</span>
              <button type="button" onClick={()=>setPersonas(p=>Math.min(30,p+1))}
                className="input-modern" style={{width:36,height:36,padding:0,textAlign:'center',fontWeight:'bold',flexShrink:0}}>+</button>
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <label className="block mb-1.5 text-[13px] font-medium" style={{color:'#1a3a22'}}>
              Notas adicionales <span className="font-normal text-[12px]" style={{color:'#5a8a6a'}}>(opcional)</span>
            </label>
            <textarea value={notas} onChange={e=>setNotas(e.target.value)}
              placeholder="Alergias, necesidades especiales, decoración, petición concreta…"
              rows={2} className="input-modern resize-none"/>
          </div>

          <button type="submit" disabled={enviando || (!!horaEntrada && !!horaSalida && !durInfo.ok)}
            className="btn-primary w-full py-3 text-[15px] disabled:opacity-50">
            {enviando ? 'Enviando…' : 'Solicitar reserva'}
          </button>
        </form>
      </div>

      {/* INFO CONTACTO */}
      <div className="glass-panel rounded-2xl p-5 flex items-center gap-4 animate-slide-up delay-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{background:'rgba(212,160,64,0.15)'}}>📞</div>
        <p className="text-sm" style={{color:'#1a3a22'}}>
          También puedes llamarnos al{' '}
          <a href="tel:+50412345678" className="font-semibold hover:underline" style={{color:'#c47a28'}}>+504 1234-5678</a>
          {' '}para reservar directamente.
        </p>
      </div>
    </div>
  )
}
