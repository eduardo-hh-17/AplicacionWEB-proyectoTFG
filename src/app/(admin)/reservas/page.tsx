'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import HorarioInput from '@/components/ui/HorarioInput'
import {
  HORA_APERTURA,
  HORA_CIERRE_ENTRADA,
  HORA_CIERRE_SALIDA,
  HORA_CALENDARIO_INICIO,
  HORA_CALENDARIO_FIN_EXCLUSIVO,
  franjasMediaHora,
} from '@/lib/horario'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ToastContainer, { useAdminToast } from '@/components/ui/Toast'

/* ─── Types ─── */
type Estado     = 'confirmada' | 'pendiente' | 'cancelada'
type TipoEvento = 'standard' | 'cumpleanos' | 'pedida' | 'evento' | 'empresa'
type Vista      = 'dia' | 'semana' | 'mes'
type Mesa       = { id: number; numero: number; capacidad: number; estado: string }

type Reserva = {
  id: string; nombre: string; apellido: string
  email: string | null; telefono: string | null
  personas: number; fecha: string; hora: string
  estado: Estado; tipo_evento: TipoEvento
  duracion_horas: number; notas: string | null
  mesa_id: number | null; created_at: string
}
type FormData = {
  nombre: string; apellido: string; email: string; telefono: string
  personas: number; fecha: string
  hora_entrada: string; hora_salida: string   // ← entrada/salida como en cliente
  estado: Estado; tipo_evento: TipoEvento
  notas: string; mesa_id: number | null
}

/* ─── Config ─── */
const TIPO: Record<TipoEvento, { label: string; color: string; bg: string; border: string; icon: string }> = {
  standard:   { label: 'Reserva',        color: '#86efac', bg: 'rgba(34,197,94,0.20)',   border: 'rgba(34,197,94,0.55)',   icon: '🍽️' },
  cumpleanos: { label: 'Cumpleaños',      color: '#fde68a', bg: 'rgba(245,158,11,0.20)',  border: 'rgba(245,158,11,0.55)',  icon: '🎂' },
  pedida:     { label: 'Pedida de mano',  color: '#fbcfe8', bg: 'rgba(236,72,153,0.20)',  border: 'rgba(236,72,153,0.50)',  icon: '💍' },
  evento:     { label: 'Evento especial', color: '#c4b5fd', bg: 'rgba(139,92,246,0.20)',  border: 'rgba(139,92,246,0.50)',  icon: '🎉' },
  empresa:    { label: 'Empresa/grupo',   color: '#93c5fd', bg: 'rgba(59,130,246,0.20)',  border: 'rgba(59,130,246,0.50)',  icon: '🏢' },
}

const EST: Record<Estado, { color: string; label: string }> = {
  confirmada: { color: '#86efac', label: 'Confirmada' },
  pendiente:  { color: '#fde68a', label: 'Pendiente'  },
  cancelada:  { color: '#fca5a5', label: 'Cancelada'  },
}

const HORAS_SEL = franjasMediaHora(HORA_APERTURA, HORA_CIERRE_ENTRADA)
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_C = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

/* Grid calendario: 12:00 – 23:00 (última franja hasta 24:00) */
const H0 = HORA_CALENDARIO_INICIO
const H1 = HORA_CALENDARIO_FIN_EXCLUSIVO
const PX = 52  // píxeles por hora (caben 12 franjas en pantallas habituales)

const FORM0: FormData = {
  nombre:'', apellido:'', email:'', telefono:'',
  personas:1, fecha:'',
  hora_entrada:'20:00', hora_salida:'21:30',
  estado:'confirmada', tipo_evento:'standard',
  notas:'', mesa_id: null as number | null,
}

/* ─── Helpers ─── */
const parseH  = (s: string)  => { const [h,m] = s.split(':').map(Number); return h + m/60 }
const isoDate = (d: Date)    => d.toISOString().split('T')[0]
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r }
const monday  = (d: Date)    => { const day = d.getDay(); return addDays(d, day===0?-6:1-day) }
const addHorasStr = (base: string, h: number) => {
  const t = parseH(base)+h; const hh = Math.floor(t); const mm = Math.round((t-hh)*60)
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

/** Assign non-overlapping columns to simultaneous reservations */
function assignCols(rsv: Reserva[]): { r: Reserva; col: number; maxCols: number }[] {
  const colEnd: number[] = []
  const assigned: { r: Reserva; col: number }[] = []
  for (const r of rsv) {
    const start = parseH(r.hora.slice(0,5))
    const end   = start + (r.duracion_horas ?? 1.5)
    let col = colEnd.findIndex(e => e <= start)
    if (col === -1) col = colEnd.length
    colEnd[col] = end
    assigned.push({ r, col })
  }
  const maxCols = colEnd.length || 1
  return assigned.map(a => ({ ...a, maxCols }))
}

/* ══════════════════════════════════════════ */
export default function AdminReservas() {
  const [vista,     setVista]     = useState<Vista>('semana')
  const [refDate,   setRefDate]   = useState(new Date())
  const [reservas,  setReservas]  = useState<Reserva[]>([])
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<Reserva|null>(null)
  const [guardando, setGuardando] = useState(false)
  const [form,      setForm]      = useState<FormData>(FORM0)
  const [detalle,   setDetalle]   = useState<Reserva|null>(null)
  const [mesas,     setMesas]     = useState<Mesa[]>([])

  type ConfirmState = { abierto: boolean; titulo: string; mensaje?: string; variante?: 'danger' | 'warning'; onAceptar: () => void }
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ abierto: false, titulo: '', onAceptar: () => {} })
  const confirmar = (cfg: Omit<ConfirmState, 'abierto'>) => setConfirmModal({ ...cfg, abierto: true })
  const cerrarConfirm = () => setConfirmModal(s => ({ ...s, abierto: false }))
  const { toast } = useAdminToast()
  const scrollCalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (vista === 'mes') return
    const el = scrollCalRef.current
    if (!el) return
    const cur = new Date().getHours() + new Date().getMinutes() / 60
    requestAnimationFrame(() => {
      if (cur >= H0 && cur < H1) {
        el.scrollTop = Math.max(0, (cur - H0) * PX - el.clientHeight * 0.35)
      } else {
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
      }
    })
  }, [vista, refDate])

  /* ─── Supabase ─── */
  const cargar = useCallback(async () => {
    const { data } = await supabase.from('reservas').select('*').order('fecha').order('hora')
    if (data) setReservas(data as Reserva[])
  }, [])

  useEffect(() => {
    supabase.from('mesas').select('id, numero, capacidad, estado').order('numero')
      .then(({ data }) => { if (data) setMesas(data as Mesa[]) })
  }, [])

  useEffect(() => {
    cargar()
    const ch = supabase.channel('res-cal-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        supabase.from('mesas').select('id, numero, capacidad, estado').order('numero')
          .then(({ data }) => { if (data) setMesas(data as Mesa[]) })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Navegación ─── */
  const nav = (d: -1|1) => setRefDate(prev => {
    const n = new Date(prev)
    if (vista==='dia')    n.setDate(n.getDate()+d)
    else if (vista==='semana') n.setDate(n.getDate()+d*7)
    else n.setMonth(n.getMonth()+d)
    return n
  })

  const navLabel = useMemo(() => {
    if (vista==='dia') return refDate.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    if (vista==='semana') {
      const lun = monday(refDate)
      const dom = addDays(lun,6)
      return `${lun.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${dom.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`
    }
    return `${MESES[refDate.getMonth()]} ${refDate.getFullYear()}`
  }, [vista, refDate])

  const byDate = useMemo(() =>
    reservas.reduce<Record<string,Reserva[]>>((a,r)=>{ (a[r.fecha]??=[]).push(r); return a }, {}),
  [reservas])

  const hoy = isoDate(new Date())

  /* ─── CRUD ─── */
  const abrirNueva = async (fecha='', hora='') => {
    await cargar()
    setEditando(null)
    const entrada = hora || '20:00'
    setForm({ ...FORM0, fecha, hora_entrada: entrada, hora_salida: addHorasStr(entrada, 1.5) })
    setModal(true)
  }
  const abrirEditar = async (r: Reserva) => {
    await cargar()
    setEditando(r)
    const entrada = r.hora.slice(0,5)
    const salida  = addHorasStr(entrada, r.duracion_horas ?? 1.5)
    setForm({ nombre:r.nombre, apellido:r.apellido, email:r.email??'', telefono:r.telefono??'',
      personas:r.personas, fecha:r.fecha,
      hora_entrada: entrada, hora_salida: salida,
      estado:r.estado, tipo_evento:r.tipo_evento??'standard',
      notas:r.notas??'', mesa_id: r.mesa_id ?? null })
    setModal(true)
  }
  const guardar = async () => {
    if (!form.nombre.trim() || !form.fecha || !form.hora_entrada || !form.hora_salida) return
    const duracion = parseH(form.hora_salida) - parseH(form.hora_entrada)
    if (duracion < 0.5 || duracion > 5) return
    setGuardando(true)
    const p = { nombre:form.nombre.trim(), apellido:form.apellido.trim(),
      email:form.email.trim()||null, telefono:form.telefono.trim()||null,
      personas:form.personas, fecha:form.fecha,
      hora: form.hora_entrada, duracion_horas: duracion,
      estado:form.estado, tipo_evento:form.tipo_evento,
      notas:form.notas.trim()||null, mesa_id: form.mesa_id||null }
    if (editando) {
      await supabase.from('reservas').update(p).eq('id', editando.id)
    } else {
      await supabase.from('reservas').insert(p)
    }

    // Email de confirmación si el estado es 'confirmada' y hay email
    if (p.estado === 'confirmada' && p.email) {
      try {
        const res = await fetch('/api/email/reserva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, apellido: p.apellido ?? '' }),
        })
        if (res.ok) {
          toast(`✉️ Email de confirmación enviado a ${p.email}`, 'success')
        } else {
          toast(`⚠️ Reserva guardada, pero no se pudo enviar el email a ${p.email}`, 'error')
        }
      } catch {
        toast('⚠️ Reserva guardada, pero falló la conexión con el servicio de email', 'error')
      }
    }

    setGuardando(false); setModal(false); cargar()
  }

  /* ── Refresca datos cada vez que se abre el modal ── */
  useEffect(() => { if (modal) cargar() }, [modal]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reservas que solapan con el horario del formulario (todas, con o sin mesa) ── */
  const reservasSolapanModal = useMemo(() => {
    if (!form.fecha || !form.hora_entrada || !form.hora_salida) return []
    const entrada = parseH(form.hora_entrada)
    const salida  = parseH(form.hora_salida)
    if (salida <= entrada) return []
    return reservas
      .filter(r => r.fecha === form.fecha && r.estado !== 'cancelada' && r.id !== editando?.id)
      .filter(r => {
        const ini = parseH(r.hora.slice(0,5))
        const fin = ini + (r.duracion_horas ?? 1.5)
        return entrada < fin && salida > ini
      })
  }, [reservas, form.fecha, form.hora_entrada, form.hora_salida, editando])

  /* ── Mesas ocupadas en tiempo real según hora_entrada/hora_salida del formulario ── */
  const mesasOcupadasModal = useMemo(() => {
    return new Set(
      reservasSolapanModal
        .filter(r => r.mesa_id)
        .map(r => r.mesa_id!)
    )
  }, [reservasSolapanModal])

  /* ── Duración calculada para validación del modal ── */
  const durInfoModal = useMemo(() => {
    if (!form.hora_entrada || !form.hora_salida) return { dur: 0, ok: false, msg: '' }
    const dur = parseH(form.hora_salida) - parseH(form.hora_entrada)
    if (dur <= 0)  return { dur, ok: false, msg: 'La hora de salida debe ser posterior.' }
    if (dur < 0.5) return { dur, ok: false, msg: 'Mínimo 30 minutos.' }
    if (dur > 5)   return { dur, ok: false, msg: 'Máximo 5 horas.' }
    return { dur, ok: true, msg: '' }
  }, [form.hora_entrada, form.hora_salida])

  const eliminar = (id: string) => {
    confirmar({
      titulo: '¿Eliminar esta reserva?',
      mensaje: 'Esta acción no se puede deshacer.',
      variante: 'danger',
      onAceptar: async () => {
        cerrarConfirm()
        await supabase.from('reservas').delete().eq('id', id)
        cargar()
        toast('Reserva eliminada', 'success')
      }
    })
  }
  const cambiarEstado = async (id: string, estado: Estado) => {
    await supabase.from('reservas').update({ estado }).eq('id', id)
    cargar()

    if (estado === 'confirmada') {
      const { data: r } = await supabase
        .from('reservas')
        .select('nombre,apellido,email,fecha,hora,personas,tipo_evento')
        .eq('id', id)
        .single()

      if (r?.email) {
        try {
          const res = await fetch('/api/email/reserva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(r),
          })
          if (res.ok) {
            toast(`✉️ Email de confirmación enviado a ${r.email}`, 'success')
          } else {
            toast(`⚠️ Reserva confirmada, pero no se pudo enviar el email a ${r.email}`, 'error')
          }
        } catch {
          toast('⚠️ Reserva confirmada, pero falló la conexión con el servicio de email', 'error')
        }
      } else {
        toast('✅ Reserva confirmada (sin email del cliente)', 'success')
      }
    }
  }

  /* ─── TIME GRID (día + semana) ─── */
  const renderTimeGrid = (dates: string[]) => {
    const rows = Array.from({length: H1-H0}, (_,i) => H0+i)

    return (
      <div className="flex rounded-2xl shrink-0" style={{border:'1px solid rgba(255,255,255,0.08)', minHeight: `${(H1-H0)*PX + 36}px`}}>
        {/* Columna de horas */}
        <div className="shrink-0 w-14 flex flex-col overflow-hidden" style={{borderRight:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="shrink-0" style={{height:36, borderBottom:'1px solid rgba(255,255,255,0.07)'}} />
          {rows.map(h => (
            <div key={h} className="shrink-0 flex items-start justify-end pr-2"
              style={{height:PX, borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span className="text-[11px] text-slate-500 mt-1 leading-none">{String(h).padStart(2,'0')}:00</span>
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        <div className="flex flex-1 overflow-x-auto min-w-0">
          {dates.map(iso => {
            const isToday = iso===hoy
            const d = new Date(iso+'T12:00')
            const label = dates.length===1
              ? d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})
              : d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric'})

            const rsv = (byDate[iso]??[]).filter(r => r.estado!=='cancelada')
            const events = assignCols(rsv)

            return (
              <div key={iso} className="flex flex-col min-w-[100px] flex-1"
                style={{borderRight:'1px solid rgba(255,255,255,0.05)'}}>

                {/* Cabecera día */}
                <div className="shrink-0 flex items-center justify-center gap-1.5 cursor-pointer select-none"
                  style={{height:36, background: isToday?'rgba(212,160,64,0.12)':'rgba(255,255,255,0.03)',
                    borderBottom:'1px solid rgba(255,255,255,0.07)'}}
                  onClick={() => { setVista('dia'); setRefDate(new Date(iso+'T12:00')) }}>
                  <span className="text-[11px] font-semibold capitalize truncate px-1"
                    style={{color: isToday?'#d4a040':'#94a3b8'}}>{label}</span>
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>}
                </div>

                {/* Grid de horas */}
                <div className="relative flex-1"
                  style={{height:(H1-H0)*PX}}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const y = e.clientY - rect.top
                    const h = Math.floor(y/PX)+H0
                    const m = y%PX < PX/2 ? '00' : '30'
                    if (h < H1) abrirNueva(iso, `${String(h).padStart(2,'0')}:${m}`)
                  }}>

                  {/* Líneas de hora */}
                  {rows.map(h => (
                    <div key={h} className="absolute left-0 right-0"
                      style={{top:(h-H0)*PX, height:PX,
                        borderTop:`1px solid rgba(255,255,255,${h%2===0?'0.05':'0.025'})`}} />
                  ))}

                  {/* Línea de hora actual */}
                  {isToday && (() => {
                    const now = new Date()
                    const cur = now.getHours() + now.getMinutes()/60
                    if (cur<H0||cur>=H1) return null
                    return (
                      <div className="absolute left-0 right-0 flex items-center pointer-events-none"
                        style={{top:(cur-H0)*PX, zIndex:5}}>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 -ml-1.5 shrink-0 shadow-sm"/>
                        <div className="flex-1 h-px" style={{background:'rgba(239,68,68,0.7)'}}/>
                      </div>
                    )
                  })()}

                  {/* Bloques de reserva */}
                  {events.map(({r, col, maxCols}) => {
                    const startH = parseH(r.hora.slice(0,5))
                    const dur    = r.duracion_horas ?? 1.5
                    const top    = (startH-H0)*PX
                    const height = Math.max(dur*PX-2, 20)
                    const t      = TIPO[r.tipo_evento??'standard']
                    const colW   = 1/maxCols
                    return (
                      <div key={r.id}
                        className="absolute rounded-lg overflow-hidden cursor-pointer transition-all hover:brightness-115 hover:scale-[1.01] hover:z-20"
                        style={{
                          top, height,
                          left: `${col*colW*100+0.5}%`,
                          width: `${colW*100-1}%`,
                          background: t.bg,
                          border: `1.5px solid ${t.border}`,
                          zIndex: 2,
                        }}
                        onClick={e => { e.stopPropagation(); setDetalle(r) }}>
                        <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden">
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] shrink-0 leading-none">{t.icon}</span>
                            <span className="text-[11px] font-bold truncate leading-tight" style={{color:t.color}}>
                              {r.hora.slice(0,5)} {r.nombre}
                            </span>
                          </div>
                          {height > 38 && (
                            <span className="text-[10px] truncate leading-none mt-0.5" style={{color:t.color, opacity:0.75}}>
                              {r.apellido} · {r.personas}p · {dur}h
                              {r.mesa_id && (() => { const m = mesas.find(x=>x.id===r.mesa_id); return m ? ` · M${m.numero}` : '' })()}
                            </span>
                          )}
                          {r.estado==='pendiente' && (
                            <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-yellow-400 shadow"/>
                          )}
                        </div>
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

  /* ─── VISTA MES ─── */
  const renderMes = () => {
    const año = refDate.getFullYear()
    const mes = refDate.getMonth()
    const offset  = (() => { const d = new Date(año,mes,1).getDay(); return d===0?6:d-1 })()
    const dias    = new Date(año,mes+1,0).getDate()
    const toI     = (d:number) => `${año}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

    return (
      <div className="rounded-2xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="grid grid-cols-7" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          {DIAS_C.map(d=>(
            <div key={d} className="text-center py-2 text-[12px] font-semibold text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({length:offset}).map((_,i)=>(
            <div key={`e${i}`} style={{minHeight:90, borderRight:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)'}}/>
          ))}
          {Array.from({length:dias}).map((_,i)=>{
            const d   = i+1
            const iso = toI(d)
            const rsv = byDate[iso]??[]
            const isToday = iso===hoy
            return (
              <div key={d} className="relative p-1.5 cursor-pointer transition-colors group"
                style={{minHeight:90,
                  border:'1px solid rgba(255,255,255,0.04)',
                  background: isToday?'rgba(212,160,64,0.07)':undefined}}
                onClick={()=>{ setVista('dia'); setRefDate(new Date(iso+'T12:00')) }}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday?'bg-amber-400 text-black':'text-slate-300'}`}>
                    {d}
                  </span>
                  <button className="text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                    onClick={e=>{e.stopPropagation();abrirNueva(iso)}}>+</button>
                </div>
                <div className="space-y-0.5">
                  {rsv.slice(0,3).map(r=>{
                    const t=TIPO[r.tipo_evento??'standard']
                    return (
                      <div key={r.id} className="flex items-center gap-1 px-1 py-0.5 rounded-md text-[10px] truncate"
                        style={{background:t.bg, color:t.color, border:`1px solid ${t.border}`}}
                        onClick={e=>{e.stopPropagation();setDetalle(r)}}>
                        <span>{t.icon}</span>
                        <span className="font-semibold">{r.hora.slice(0,5)}</span>
                        <span className="truncate">{r.nombre}</span>
                        <span className="opacity-60 shrink-0">{r.personas}p</span>
                      </div>
                    )
                  })}
                  {rsv.length>3 && (
                    <div className="text-[10px] text-slate-500 pl-1">+{rsv.length-3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── DETALLE POPUP ─── */
  const renderDetalle = () => {
    if (!detalle) return null
    const t = TIPO[detalle.tipo_evento??'standard']
    const e = EST[detalle.estado]
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
        onClick={()=>setDetalle(null)}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          onClick={ev=>ev.stopPropagation()}>
          {/* Header colored by type */}
          <div className="px-5 py-4 flex items-start justify-between"
            style={{background:t.bg, borderBottom:`1px solid ${t.border}`}}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{t.icon}</span>
              <div>
                <p className="font-bold text-white text-[15px]">{detalle.nombre} {detalle.apellido}</p>
                <p className="text-[12px] font-medium mt-0.5" style={{color:t.color}}>{t.label}</p>
              </div>
            </div>
            <button onClick={()=>setDetalle(null)} className="text-slate-400 hover:text-white text-lg w-7 h-7 flex items-center justify-center">✕</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label:'Fecha', val:`${detalle.fecha}` },
                { label:'Hora',  val:`${detalle.hora.slice(0,5)} (${detalle.duracion_horas}h)` },
                { label:'Personas', val:`${detalle.personas}` },
                { label:'Estado',   val:e.label, color:e.color },
              ].map(item=>(
                <div key={item.label} className="px-3 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.06)'}}>
                  <p className="text-[11px] text-slate-500">{item.label}</p>
                  <p className="font-semibold" style={{color:item.color??'white'}}>{item.val}</p>
                </div>
              ))}
            </div>
          {detalle.telefono && <p className="text-sm text-slate-300">📞 {detalle.telefono}</p>}
          {detalle.email    && <p className="text-sm text-slate-300">✉️ {detalle.email}</p>}
          {detalle.mesa_id  && (() => {
            const m = mesas.find(x=>x.id===detalle.mesa_id)
            return m ? (
              <p className="text-sm font-semibold" style={{color:'#86efac'}}>
                🪑 Mesa {m.numero} · {m.capacidad} personas
              </p>
            ) : null
          })()}
          {detalle.notas    && (
              <div className="px-3 py-2 rounded-xl text-sm" style={{background:'rgba(255,255,255,0.06)',color:'#c8e4f8'}}>
                💬 {detalle.notas}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {detalle.estado==='pendiente' && (
                <button
                  onClick={() => {
                    setDetalle(null)
                    // Abre el modal con estado ya cambiado a confirmada para asignar mesa en un paso
                    abrirEditar({ ...detalle, estado: 'confirmada' })
                  }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'rgba(34,197,94,0.65)' }}>
                  ✓ Confirmar y asignar mesa
                </button>
              )}
              {detalle.estado==='confirmada' && <button onClick={()=>{cambiarEstado(detalle.id,'cancelada');setDetalle(null)}} className="flex-1 py-2 rounded-xl text-sm" style={{background:'rgba(239,68,68,0.2)',color:'#fca5a5'}}>✕ Cancelar</button>}
              {detalle.estado==='cancelada'  && <button onClick={()=>{cambiarEstado(detalle.id,'confirmada');setDetalle(null)}} className="flex-1 py-2 rounded-xl text-sm" style={{background:'rgba(34,197,94,0.2)',color:'#86efac'}}>↩ Reactivar</button>}
              <button onClick={()=>{setDetalle(null);abrirEditar(detalle)}} className="flex-1 py-2 rounded-xl text-sm text-slate-300" style={{border:'1px solid rgba(255,255,255,0.15)'}}>✎ Editar</button>
              <button onClick={()=>{eliminar(detalle.id);setDetalle(null)}} className="py-2 px-3 rounded-xl text-sm" style={{color:'#fca5a5',border:'1px solid rgba(239,68,68,0.25)'}}>🗑</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── SEMANA / DÍA ─── */
  const renderSemana = () => {
    const lun = monday(refDate)
    const dates = Array.from({length:7}, (_,i) => isoDate(addDays(lun,i)))
    return renderTimeGrid(dates)
  }
  const renderDia = () => renderTimeGrid([isoDate(refDate)])

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="flex flex-col gap-4 pb-6">
      <ToastContainer />
      <ConfirmModal
        abierto={confirmModal.abierto}
        titulo={confirmModal.titulo}
        mensaje={confirmModal.mensaje}
        variante={confirmModal.variante}
        onAceptar={confirmModal.onAceptar}
        onCancelar={cerrarConfirm}
      />

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <h1 className="text-2xl font-bold text-gradient-anim">Reservas</h1>

        {/* Toggle vista */}
        <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.12)'}}>
          {(['dia','semana','mes'] as Vista[]).map(v=>(
            <button key={v} onClick={()=>setVista(v)}
              className="px-3 py-1.5 text-sm font-medium transition-all"
              style={vista===v
                ? {background:'linear-gradient(135deg,#1e5c2e,#2d8a44)',color:'#fff'}
                : {color:'#94a3b8'}}>
              {v==='dia'?'Día':v==='semana'?'Semana':'Mes'}
            </button>
          ))}
        </div>

        {/* Navegación */}
        <div className="flex items-center gap-1">
          <button onClick={()=>nav(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg">‹</button>
          <button onClick={()=>setRefDate(new Date())} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all" style={{border:'1px solid rgba(255,255,255,0.12)'}}>Hoy</button>
          <button onClick={()=>nav(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg">›</button>
          <span className="text-white font-semibold text-sm capitalize ml-1">{navLabel}</span>
        </div>

        {/* Leyenda */}
        <div className="hidden xl:flex items-center gap-3 flex-wrap ml-1">
          {(Object.entries(TIPO) as [TipoEvento, typeof TIPO[TipoEvento]][]).map(([k,v])=>(
            <div key={k} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{background:v.border}}/>
              <span className="text-[11px] text-slate-400">{v.icon} {v.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1"/>
        <button onClick={()=>abrirNueva()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{background:'linear-gradient(135deg,#1e5c2e,#2d8a44)',boxShadow:'0 2px 12px rgba(30,92,46,0.45)'}}>
          + Nueva reserva
        </button>
      </div>

      {/* ── CONTENIDO ── */}
      <div ref={scrollCalRef} className="overflow-y-auto overflow-x-hidden" style={{maxHeight:'calc(100vh - 220px)'}}>
        {vista==='dia'    && renderDia()}
        {vista==='semana' && renderSemana()}
        {vista==='mes'    && renderMes()}
      </div>

      {/* ── DETALLE ── */}
      {renderDetalle()}

      {/* ── MODAL CRUD ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={()=>setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[92vh] shadow-2xl"
            onClick={e=>e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
              <h2 className="text-white font-semibold">{editando?'✎ Editar reserva':'+ Nueva reserva'}</h2>
              <button onClick={()=>setModal(false)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Tipo evento */}
              <div>
                <label className="text-slate-400 text-xs block mb-2">Tipo de evento</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(Object.entries(TIPO) as [TipoEvento, typeof TIPO[TipoEvento]][]).map(([k,v])=>(
                    <button key={k} type="button" onClick={()=>setForm({...form,tipo_evento:k})}
                      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                      style={form.tipo_evento===k
                        ? {background:v.bg, border:`1.5px solid ${v.border}`, color:v.color}
                        : {background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', color:'#94a3b8'}}>
                      <span className="text-lg leading-none">{v.icon}</span>
                      <span className="leading-tight text-center">{v.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors" placeholder="Ana"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Apellido</label>
                  <input value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors" placeholder="García"/>
                </div>
              </div>

              {/* Email + Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors" placeholder="ana@email.com"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors" placeholder="+504 XXXX-XXXX"/>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">Fecha *</label>
                <input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors"/>
              </div>

              {/* Horario entrada → salida */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">Horario *</label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1">Hora llegada</p>
                    <HorarioInput
                      value={form.hora_entrada}
                      onChange={v => setForm({...form, hora_entrada: v, hora_salida: addHorasStr(v, 1.5)})}
                      tema="admin"
                      maxHora={HORA_CIERRE_ENTRADA}
                    />
                  </div>
                  <span className="text-slate-400 text-lg mb-5">→</span>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1">Hora salida</p>
                    <HorarioInput
                      value={form.hora_salida}
                      onChange={v => setForm({...form, hora_salida: v})}
                      tema="admin"
                      minHora={form.hora_entrada}
                      maxHora={HORA_CIERRE_SALIDA}
                    />
                  </div>
                </div>
                {/* Badge duración */}
                <div className="mt-1.5 min-h-[22px]">
                  {form.hora_entrada && form.hora_salida && (
                    durInfoModal.ok
                      ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{background:'rgba(34,197,94,0.15)', color:'#86efac', border:'1px solid rgba(34,197,94,0.35)'}}>
                          ✓ {Math.floor(durInfoModal.dur)}h{durInfoModal.dur%1!==0?` ${Math.round((durInfoModal.dur%1)*60)}min`:''}
                        </span>
                      : <span className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{background:'rgba(239,68,68,0.12)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.35)'}}>
                          ⚠️ {durInfoModal.msg}
                        </span>
                  )}
                </div>
              </div>

              {/* Personas + Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Personas</label>
                  <input type="number" min={1} max={50} value={form.personas}
                    onChange={e=>setForm({...form,personas:Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors"/>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Estado</label>
                  <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as Estado})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors">
                    <option value="confirmada">✅ Confirmada</option>
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="cancelada">❌ Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">
                  Notas <span className="text-slate-500">(alergias, accesibilidad, petición especial…)</span>
                </label>
                <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})}
                  rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-400 transition-colors resize-none"
                  placeholder="Ej: cumpleaños sorpresa, alergia al gluten, silla de ruedas…"/>
              </div>

              {/* ── ASIGNAR MESA ── */}
              {mesas.length > 0 && (
                <div>
                  <label className="text-slate-400 text-xs block mb-2">
                    Asignar mesa
                    <span className="ml-1.5 text-slate-500">(opcional — puedes hacerlo después)</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {mesas.map(m => {
                      const ocupada = mesasOcupadasModal.has(m.id)
                      const sel     = form.mesa_id === m.id
                      return (
                        <button key={m.id} type="button"
                          disabled={ocupada && !sel}
                          onClick={() => setForm({...form, mesa_id: sel ? null : m.id})}
                          className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all disabled:cursor-not-allowed"
                          style={
                            sel     ? { background:'rgba(45,138,68,0.35)', border:'2px solid rgba(45,138,68,0.8)' }
                            : ocupada ? { background:'rgba(239,68,68,0.12)', border:'1.5px solid rgba(239,68,68,0.40)', opacity:0.6 }
                            : { background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.12)' }
                          }>
                          <span className="text-[15px] font-black"
                            style={{ color: sel?'#86efac' : ocupada?'#fca5a5' : '#cbd5e1' }}>
                            {m.numero}
                          </span>
                          <span className="text-[9px] font-medium"
                            style={{ color: sel?'#86efac' : ocupada?'#fca5a5' : '#64748b' }}>
                            {m.capacidad}p
                          </span>
                          {ocupada && !sel && (
                            <span className="text-[8px]" style={{color:'#ef4444'}}>Ocu.</span>
                          )}
                          {sel && (
                            <span className="text-[8px]" style={{color:'#86efac'}}>✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {/* Aviso reservas sin mesa asignada en este horario */}
                  {(() => {
                    const sinMesa = reservasSolapanModal.filter(r => !r.mesa_id).length
                    if (!sinMesa) return null
                    return (
                      <p className="text-[11px] mt-2 px-2.5 py-1.5 rounded-lg font-medium"
                        style={{background:'rgba(234,179,8,0.12)',border:'1px solid rgba(234,179,8,0.35)',color:'#fde047'}}>
                        ⚠️ {sinMesa} reserva{sinMesa>1?'s':''} en este horario aún sin mesa asignada —
                        las mesas marcadas como libres podrían estar ocupadas.
                      </p>
                    )
                  })()}
                  {form.mesa_id && (
                    <p className="text-[11px] mt-1.5 font-semibold" style={{color:'#86efac'}}>
                      ✓ Mesa {mesas.find(m=>m.id===form.mesa_id)?.numero} ({mesas.find(m=>m.id===form.mesa_id)?.capacidad} pers.) asignada
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 flex gap-3 justify-end shrink-0" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <button onClick={()=>setModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.42)',color:'#fca5a5'}}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !durInfoModal.ok}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#1e5c2e,#2d8a44)',boxShadow:'0 2px 10px rgba(30,92,46,0.4)'}}>
                {guardando?'Guardando…':editando?'💾 Guardar':'✓ Crear reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
