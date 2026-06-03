'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── TIPOS ──
type Ingrediente = {
  id: number
  nombre: string
  imagen_url: string | null
  activo: boolean
}

type Plato = {
  id: number
  nombre: string
  emoji: string
  descripcion: string
  precio: number
  ingredientes: Ingrediente[]
  activo: boolean
  categoria_id:number | null
    imagen_url: string | null
  imagenes?: string[]
}


export default function Menu() {

  // ── ESTADOS ──
  const [platos, setPlatos] = useState<Plato[]>([])
  const [cargando, setCargando] = useState(true)
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)

  // Campos editables del modal
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [guardando, setGuardando] = useState(false)
  // --Nuevos componentes
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')

  const [nuevaDesc, setNuevaDesc] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [categorias, setCategorias] = useState<{id: number, nombre: string, emoji: string}[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState<number | null>(null)
  const [categoriaEditar, setCategoriaEditar] = useState<number | null>(null)

  const [imagenUrl, setImagenUrl] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('')
  const [nuevosIngredientes, setNuevosIngredientes] = useState<Ingrediente[]>([])
  const [nuevasImagenes, setNuevasImagenes] = useState<string[]>([])
  const [imagenesEditar, setImagenesEditar] = useState<string[]>([])

  // ── CARGA INICIAL ──
  useEffect(() => {
    cargarPlatos()
    cargarCategorias()

    // Escucha cambios en tiempo real
    const canal = supabase
      .channel('platos-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platos' }, () => cargarPlatos())
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  // ── FUNCIONES ──
    const cargarCategorias = async () => {
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('orden')
    if (data) setCategorias(data)
  }

  const cargarPlatos = async () => {
    const { data } = await supabase
      .from('platos')
      .select('*')
      .order('id')
    if (data) setPlatos(data)
    setCargando(false)
  }

  // Abre el modal con los datos del plato
  const abrirModal = (plato: Plato) => {
    setPlatoSeleccionado(plato)
    setNombre(plato.nombre)
    setDescripcion(plato.descripcion)
    setPrecio(plato.precio.toString())
    setCategoriaEditar(plato.categoria_id ?? null)
    setImagenUrl(plato.imagen_url || '')
    setImagenesEditar(
      Array.isArray(plato.imagenes) && plato.imagenes.length > 0
        ? plato.imagenes
        : plato.imagen_url
          ? [plato.imagen_url]
          : []
    )
    setIngredientes(
      Array.isArray(plato.ingredientes)
        ? plato.ingredientes.map(ing =>
            typeof ing === 'string'
                            ? { id: 0, nombre: ing, imagen_url: null, activo: true }
              : {
                  ...ing,
                  imagen_url: ing.imagen_url ?? null,
                  nombre: ing.nombre ?? '',
                }
          )
        : []
    )
    setModalAbierto(true)
  }

  // Guarda los cambios en Supabase
  const guardarCambios = async () => {
    if (!platoSeleccionado) return
    setGuardando(true)
    await supabase
      .from('platos')
      .update({
        nombre,
        descripcion,
        precio: parseFloat(precio),
        categoria_id: categoriaEditar,
        ingredientes,
        imagen_url: imagenesEditar[0] || null,
        imagenes: imagenesEditar,
      })
      .eq('id', platoSeleccionado.id)
    setGuardando(false)
    setModalAbierto(false)
  }

  // Desactiva el plato — desaparece de la web del cliente
  const toggleActivoPlato = async () => {
    if (!platoSeleccionado) return
    await supabase
      .from('platos')
      .update({ activo: !platoSeleccionado.activo })
      .eq('id', platoSeleccionado.id)
    setModalAbierto(false)
  }

  // Elimina el plato — pregunta confirmación primero
  const eliminarPlato = async () => {
    if (!platoSeleccionado) return
    await supabase
      .from('platos')
      .delete()
      .eq('id', platoSeleccionado.id)
    setModalEliminar(false)
    setModalAbierto(false)
  }

const crearPlato = async () => {
  if (!nuevoNombre || !nuevoPrecio) return

  // Verificar sesión activa
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    alert('No hay sesión activa — vuelve a iniciar sesión')
    return
  }

  const { data, error } = await supabase
    .from('platos')
    .insert({
      nombre: nuevoNombre,
      emoji: '',
      descripcion: nuevaDesc,
      precio: parseFloat(nuevoPrecio),
      categoria_id: nuevaCategoria,
      ingredientes: nuevosIngredientes.filter((i) => i.nombre.trim()), 
      activo: true,
      imagen_url: nuevasImagenes[0] || nuevaImagenUrl || null,
      imagenes: nuevasImagenes.length > 0 ? nuevasImagenes : [],
    })
    .select()

  if (error) {
    alert('Error: ' + error.message)
    return
  }

  setModalNuevo(false)
  setNuevoNombre('')
  setNuevaImagenUrl('')
  setNuevasImagenes([])
  setNuevaDesc('')
  setNuevoPrecio('')
  setNuevaCategoria(null)
  setNuevosIngredientes([])
}
  

  // Envía el plato a cocina — crea un pedido en Supabase


    const agregarIngrediente = (lista: 'editar' | 'nuevo') => {
    const nuevo: Ingrediente = {
      id: Date.now(),
      nombre: '',
      imagen_url: null,
      activo: true,
    }
    if (lista === 'editar') {
      setIngredientes([...ingredientes, nuevo])
    } else {
      setNuevosIngredientes([...nuevosIngredientes, nuevo])
    }
  }

  const actualizarIngrediente = (
    index: number,
    campo: 'nombre' | 'imagen_url',
    valor: string,
    lista: 'editar' | 'nuevo'
  ) => {
        if (lista === 'editar') {
      setIngredientes(
        ingredientes.map((ing, i) =>
          i === index
            ? {
                ...ing,
                [campo]: campo === 'nombre' ? valor : (valor || null),
              }
            : ing
        )
      )
    } else {
      setNuevosIngredientes(
        nuevosIngredientes.map((ing, i) =>
          i === index
            ? {
                ...ing,
                [campo]: campo === 'nombre' ? valor : (valor || null),
              }
            : ing
        )
      )
    }
  }

  const quitarIngrediente = (index: number, lista: 'editar' | 'nuevo') => {
    if (lista === 'editar') {
      setIngredientes(ingredientes.filter((_, i) => i !== index))
    } else {
      setNuevosIngredientes(nuevosIngredientes.filter((_, i) => i !== index))
    }
  }

  const subirImagenIngrediente = async (
    index: number,
    file: File,
    lista: 'editar' | 'nuevo'
  ) => {
    const url = await subirImagen(file)
    if (url) actualizarIngrediente(index, 'imagen_url', url, lista)
  }

  
  // Activa o desactiva un ingrediente
  const toggleIngrediente = (index: number) => {
    setIngredientes(ingredientes.map((ing, i) =>
      i === index ? { ...ing, activo: !ing.activo } : ing
    ))
  }


  // Subir imagen a Supabase Storage
  const subirImagen = async (file: File): Promise<string | null> => {
    setSubiendoImagen(true)
    const fileName = `${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('platos').upload(fileName, file)
    if (error) {
      console.error('Error subiendo imagen:', error)
      setSubiendoImagen(false)
      return null
    }
    const { data } = supabase.storage.from('platos').getPublicUrl(fileName)
    setSubiendoImagen(false)
    return data.publicUrl
  }


  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando menú...</p>
    </div>
  )

  return (
    <div>

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gradient-anim">Menú</h1>
        <button
          onClick={() => setModalNuevo(true)}
          className="bg-[#0d1f3c] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1e3a6e] transition-colors flex items-center gap-2"
        >
          + Añadir plato
        </button>
      </div>

      {/* ── GRID DE PLATOS ── */}
      <div className="grid grid-cols-4 gap-4">
        {platos.map((plato) => (
          <div
            key={plato.id}
            className={`rounded-2xl border text-left overflow-hidden transition-all relative ${
              plato.activo
                ? 'bg-white border-slate-200 hover:shadow-md'
                : 'bg-slate-100 border-slate-300 opacity-70 grayscale'
            }`}
          >
            {/* Zona clicable → abre editar */}
            <button
              type="button"
              onClick={() => abrirModal(plato)}
              className="w-full text-left"
            >
              <div className="relative h-24 bg-[#f8faff] flex items-center justify-center border-b border-slate-100 overflow-hidden">
                {plato.imagen_url ? (
                  <img src={plato.imagen_url} alt={plato.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-300 text-xs">Sin imagen</span>
                )}
                {!plato.activo && (
                  <div className="absolute inset-0 bg-slate-500/30 flex items-center justify-center">
                    <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded-full">Inactivo</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-white text-sm font-medium mb-1">{plato.nombre}</p>
                <p className="text-slate-400 text-xs mb-3 line-clamp-2 leading-relaxed">{plato.descripcion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 text-sm font-medium">{plato.precio.toFixed(2)}€</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${plato.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                    {plato.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </button>

            {/* Botón activar/desactivar — esquina superior derecha */}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                await supabase
                  .from('platos')
                  .update({ activo: !plato.activo })
                  .eq('id', plato.id)
              }}
              title={plato.activo ? 'Desactivar' : 'Activar'}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md z-10 ${
                plato.activo
                  ? 'bg-white hover:bg-red-50'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {plato.activo ? '🚫' : '✅'}
            </button>
          </div>
        ))}
      </div>

      {/* ── MODAL EDICIÓN ── */}
      {modalAbierto && platoSeleccionado && (
        <div
          onClick={() => setModalAbierto(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-[560px] flex flex-col max-h-[90vh] shadow-2xl"
          >

            {/* Cabecera — fija */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                {platoSeleccionado.imagen_url && (
                  <img src={platoSeleccionado.imagen_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                )}
                <h2 className="text-white font-medium">{platoSeleccionado.nombre}</h2>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo modal — scrollable, dos columnas */}
            <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-0">

              {/* Columna izquierda — campos editables */}
              <div className="p-6 border-r border-slate-200 flex flex-col gap-4">
                <p className="text-white text-sm font-medium">Editar plato</p>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-400 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Categoría</label>
                  <select
                    value={categoriaEditar ?? ''}
                    onChange={(e) => setCategoriaEditar(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-400 transition-colors"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Precio (€)</label>
                  <input
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-400 transition-colors"
                  />
                </div>


                
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Imágenes del plato</label>

                  {imagenesEditar.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {imagenesEditar.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImagenesEditar(imagenesEditar.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-bl"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                    <span className="text-slate-400 text-xs">+ Añadir foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await subirImagen(file)
                          if (url) setImagenesEditar(prev => [...prev, url])
                        }
                      }}
                    />
                  </label>
                  {subiendoImagen && <p className="text-xs text-gray-400 mt-1">Subiendo...</p>}
                </div>
              </div>

              {/* Columna derecha — ingredientes */}
              {/* Columna derecha — ingredientes (empleado) */}
              <div className="p-6 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">Ingredientes</p>
                  <button
                    type="button"
                    onClick={() => agregarIngrediente('editar')}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    + Añadir
                  </button>
                </div>

                {ingredientes.length === 0 ? (
                  <p className="text-slate-400 text-xs">Pulsa + para añadir ingredientes</p>
                ) : (
                  ingredientes.map((ing, index) => (
                    <div key={ing.id ?? index} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                      <input
                        value={ing.nombre ?? ''}
                        onChange={(e) => actualizarIngrediente(index, 'nombre', e.target.value, 'editar')}
                        placeholder="Nombre del ingrediente"
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        {ing.imagen_url ? (
                          <img src={ing.imagen_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <span className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            Foto
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) subirImagenIngrediente(index, file, 'editar')
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => quitarIngrediente(index, 'editar')}
                        className="text-xs text-red-500 self-end"
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            </div>{/* cierre scroll wrapper */}

            {/* Pie modal — fijo */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-2 shrink-0">

              {/* Guardar */}
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1e5c2e,#2d8a44)', boxShadow: '0 2px 10px rgba(30,92,46,0.4)' }}
                onMouseEnter={e => { if (!guardando) e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = '' }}
              >
                {guardando ? 'Guardando...' : '💾 Guardar cambios'}
              </button>


              {/* Activar / Desactivar */}
              <button
                onClick={toggleActivoPlato}
                title={platoSeleccionado.activo ? 'Desactivar plato' : 'Activar plato'}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  platoSeleccionado.activo
                    ? 'border border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200'
                    : 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {platoSeleccionado.activo ? '🚫' : '✅'}
              </button>

              {/* Eliminar */}
              <button
                onClick={() => setModalEliminar(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                🗑️
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {modalEliminar && (
        <div
          onClick={() => setModalEliminar(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-80 p-6 shadow-2xl"
          >
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="text-white font-medium text-base mb-2">¿Eliminar plato?</h3>
              <p className="text-slate-400 text-sm">
                Vas a eliminar <strong>{platoSeleccionado?.nombre}</strong> de la base de datos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={eliminarPlato}
                className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setModalEliminar(false)}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.42)', color: '#fca5a5' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── MODAL NUEVO PLATO ── */}
      {modalNuevo && (
        <div
          onClick={() => setModalNuevo(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh] shadow-2xl"
          >
            {/* Cabecera — fija */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-white font-medium">Nuevo plato</h2>
              <button
                onClick={() => setModalNuevo(false)}
                className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            {/* Cuerpo — scrollable */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Imágenes del plato</label>

                {/* Miniaturas ya subidas */}
                {nuevasImagenes.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {nuevasImagenes.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNuevasImagenes(nuevasImagenes.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-bl"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subir otra foto */}
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                  <span className="text-slate-400 text-xs">+ Añadir foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await subirImagen(file)
                        if (url) setNuevasImagenes(prev => [...prev, url])
                      }
                    }}
                  />
                </label>
                {subiendoImagen && <p className="text-xs text-gray-400 mt-1">Subiendo...</p>}
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">Nombre</label>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del plato"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Descripción</label>
                <textarea
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  placeholder="Descripción del plato"
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
                />
              </div>


              <div>
                <label className="text-slate-400 text-xs block mb-1">Categoría</label>
                <select
                  value={nuevaCategoria ?? ''}
                  onChange={(e) => setNuevaCategoria(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

                            <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400 text-xs">Ingredientes</label>
                  <button
                    type="button"
                    onClick={() => agregarIngrediente('nuevo')}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    + Añadir ingrediente
                  </button>
                </div>

                {nuevosIngredientes.length === 0 ? (
                  <p className="text-slate-400 text-xs">Opcional: añade ingredientes para que el cliente elija</p>
                ) : (
                  nuevosIngredientes.map((ing, index) => (
                    <div key={ing.id} className="border border-slate-200 rounded-xl p-3 mb-2 flex flex-col gap-2">
                      <input
                        value={ing.nombre}
                        onChange={(e) => actualizarIngrediente(index, 'nombre', e.target.value, 'nuevo')}
                        placeholder="Ej: Carne Whopper"
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        {ing.imagen_url ? (
                          <img src={ing.imagen_url} alt="" className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <span className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            Foto
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs flex-1"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) subirImagenIngrediente(index, file, 'nuevo')
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => quitarIngrediente(index, 'nuevo')}
                        className="text-xs text-red-500 self-end"
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Precio (€)</label>
                <input
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>{/* cierre cuerpo scrollable */}
            {/* Footer — fijo */}
            <div className="px-6 py-4 border-t border-slate-200 shrink-0">
              <button
                onClick={crearPlato}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#1e5c2e,#2d8a44)', boxShadow: '0 2px 10px rgba(30,92,46,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = '' }}
              >
                ✓ Crear plato
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}