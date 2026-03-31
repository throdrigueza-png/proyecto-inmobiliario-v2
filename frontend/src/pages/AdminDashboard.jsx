import { useEffect, useState, useRef } from 'react'
import {
  LayoutDashboard, Plus, Pencil, Trash2, CheckCircle, X,
  Building2, Tag, Maximize2, MapPin, ImageIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getProperties, createProperty, updateProperty, deleteProperty, getUsers, uploadImage } from '../api'
import { useAuth } from '../contexts/AuthContext'

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  precio: '',
  tamaño_m2: '',
  direccion: '',
  latitud: '',
  longitud: '',
  url_imagen: '',
  tipo_transaccion: 'venta',
  estado: 'disponible',
  owner_id: '',
}

const TIPO_OPTS = [
  { value: 'venta', label: 'Venta' },
  { value: 'arriendo', label: 'Arriendo' },
]

const STATUS_OPTS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arrendado', label: 'Arrendado' },
]

const STATUS_COLORS = {
  disponible: 'bg-emerald-500/20 text-emerald-400',
  reservado: 'bg-sky-500/20 text-sky-400',
  vendido: 'bg-red-500/20 text-red-400',
  arrendado: 'bg-amber-500/20 text-amber-400',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, isAdmin, loading: authLoading } = useAuth()

  const [properties, setProperties] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Image upload state — imagePreview is always either a blob: URL (from
  // URL.createObjectURL) or a sanitized https: URL, never user-controlled text.
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Derive a URL-safe src for the preview <img>: only allow blob: and https?:.
  const safePreviewSrc = imagePreview && /^(blob:|https?:)/.test(imagePreview) ? imagePreview : null

  // Google Places Autocomplete refs
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, isAdmin, navigate])

  const refresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    if (!user || !isAdmin) return
    Promise.all([getProperties(), getUsers()])
      .then(([pRes, uRes]) => {
        setProperties(pRes.data)
        setUsers(uRes.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Error cargando datos.')
        setLoading(false)
      })
  }, [refreshKey, user, isAdmin])

  // Load Google Maps Places Autocomplete when the form opens
  useEffect(() => {
    if (!showForm) {
      // Clean up the autocomplete instance when form closes
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
      return
    }

    const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!MAPS_KEY) return // Falls back to plain text input

    let ac = null

    const initAutocomplete = () => {
      if (!addressInputRef.current || autocompleteRef.current) return
      ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['geocode'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place.geometry?.location) {
          setForm((prev) => ({
            ...prev,
            direccion: place.formatted_address || prev.direccion,
            latitud: place.geometry.location.lat(),
            longitud: place.geometry.location.lng(),
          }))
        }
      })
      autocompleteRef.current = ac
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      const existingScript = document.getElementById('gmaps-places-script')
      if (existingScript) {
        existingScript.addEventListener('load', initAutocomplete)
      } else {
        const script = document.createElement('script')
        script.id = 'gmaps-places-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.addEventListener('load', initAutocomplete)
        document.head.appendChild(script)
      }
    }

    return () => {
      if (ac) {
        window.google?.maps?.event?.clearInstanceListeners(ac)
      }
    }
  }, [showForm])

  const notify = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    let imageUrl = form.url_imagen

    // Upload new image file if one was selected
    if (imageFile) {
      setUploading(true)
      try {
        const res = await uploadImage(imageFile)
        imageUrl = res.data.url
      } catch (err) {
        const detail = err.response?.data?.detail || 'Verifica la configuración de Cloudinary en el servidor.'
        setError(`Error subiendo la imagen: ${detail}`)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const payload = {
      ...form,
      precio: parseFloat(form.precio),
      tamaño_m2: form.tamaño_m2 ? parseFloat(form.tamaño_m2) : null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      owner_id: parseInt(form.owner_id),
      url_imagen: imageUrl || null,
    }
    try {
      if (editId) {
        await updateProperty(editId, payload)
        notify('Propiedad actualizada.')
      } else {
        await createProperty(payload)
        notify('Propiedad creada.')
      }
      closeForm()
      refresh()
    } catch {
      setError('Error guardando la propiedad.')
    }
  }

  const handleEdit = (p) => {
    setForm({
      titulo: p.titulo,
      descripcion: p.descripcion ?? '',
      precio: p.precio,
      tamaño_m2: p.tamaño_m2 ?? '',
      direccion: p.direccion ?? '',
      latitud: p.latitud ?? '',
      longitud: p.longitud ?? '',
      url_imagen: p.url_imagen ?? '',
      tipo_transaccion: p.tipo_transaccion ?? 'venta',
      estado: p.estado,
      owner_id: p.owner_id,
    })
    setImageFile(null)
    setImagePreview(p.url_imagen && /^https?:/.test(p.url_imagen) ? p.url_imagen : null)
    setEditId(p.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta propiedad?')) return
    try {
      await deleteProperty(id)
      notify('Propiedad eliminada.')
      refresh()
    } catch {
      setError('Error eliminando la propiedad.')
    }
  }

  const statusCounts = STATUS_OPTS.reduce((acc, s) => {
    acc[s.value] = properties.filter((p) => p.estado === s.value).length
    return acc
  }, {})

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-emerald-400" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administrador</h1>
              <p className="text-slate-400 text-sm">Inmobiliaria Mónica Anzola</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); setImageFile(null); setImagePreview(null) }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={18} /> Nueva propiedad
          </button>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-xl">
            <CheckCircle size={18} /> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl">
            <X size={18} /> {error}
            <button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATUS_OPTS.map((s) => (
            <div key={s.value} className="bg-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-sm mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-white">{statusCounts[s.value] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Property form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                onClick={closeForm}
              >
                <X size={22} />
              </button>
              <h2 className="text-xl font-bold text-white mb-5">
                {editId ? 'Editar propiedad' : 'Nueva propiedad'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field label="Título *" icon={<Building2 size={14} />}>
                  <input
                    required
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="input-dark"
                    placeholder="Casa en el norte, Apto 101…"
                  />
                </Field>

                <Field label="Descripción" icon={<Pencil size={14} />}>
                  <textarea
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="input-dark resize-none"
                    placeholder="Descripción del inmueble…"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo *" icon={<Tag size={14} />}>
                    <select
                      value={form.tipo_transaccion}
                      onChange={(e) => setForm({ ...form, tipo_transaccion: e.target.value })}
                      className="input-dark"
                    >
                      {TIPO_OPTS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Estado *" icon={<Tag size={14} />}>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      className="input-dark"
                    >
                      {STATUS_OPTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Precio (COP) *" icon={<Tag size={14} />}>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1000"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      className="input-dark"
                      placeholder="250000000"
                    />
                  </Field>
                  <Field label="Tamaño (m²)" icon={<Maximize2 size={14} />}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.tamaño_m2}
                      onChange={(e) => setForm({ ...form, tamaño_m2: e.target.value })}
                      className="input-dark"
                      placeholder="80"
                    />
                  </Field>
                </div>

                {/* Address with Google Places Autocomplete */}
                <Field label="Dirección" icon={<MapPin size={14} />}>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="input-dark"
                    placeholder="Calle 123 # 45-67, Bogotá, Colombia"
                    autoComplete="off"
                  />
                  {/* Coordinates status indicator */}
                  {form.latitud && form.longitud ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs mt-1">
                      <MapPin size={11} />
                      Coordenadas detectadas ({Number(form.latitud).toFixed(5)}, {Number(form.longitud).toFixed(5)})
                    </span>
                  ) : (
                    import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                      <span className="text-slate-500 text-xs mt-1">
                        Escribe la dirección y selecciona una sugerencia para detectar las coordenadas automáticamente
                      </span>
                    )
                  )}
                </Field>

                {/* Image upload */}
                <Field label="Foto de la propiedad" icon={<ImageIcon size={14} />}>
                  <div className="flex flex-col gap-2">
                    {safePreviewSrc && (
                      <div className="relative h-32 rounded-xl overflow-hidden border border-slate-600">
                        <img
                          src={safePreviewSrc}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); setForm((f) => ({ ...f, url_imagen: '' })) }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImageFile(file)
                          setImagePreview(URL.createObjectURL(file))
                        }
                      }}
                      className="text-slate-300 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600/20 file:text-emerald-400 file:font-medium file:cursor-pointer hover:file:bg-emerald-600/30 file:transition-colors"
                    />
                    {!imagePreview && (
                      <p className="text-slate-500 text-xs">Selecciona una foto desde tu computador o celular</p>
                    )}
                  </div>
                </Field>

                <Field label="Asignar a usuario *" icon={<Building2 size={14} />}>
                  <select
                    required
                    value={form.owner_id}
                    onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                    className="input-dark"
                  >
                    <option value="">Seleccionar usuario…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.email})
                      </option>
                    ))}
                  </select>
                </Field>

                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {uploading ? 'Subiendo imagen…' : editId ? 'Guardar cambios' : 'Crear propiedad'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-center text-slate-400 py-20 animate-pulse">Cargando…</p>
        ) : (
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Título</th>
                  <th className="px-5 py-4 text-left hidden sm:table-cell">Tipo</th>
                  <th className="px-5 py-4 text-left hidden md:table-cell">Precio</th>
                  <th className="px-5 py-4 text-left hidden lg:table-cell">Tamaño</th>
                  <th className="px-5 py-4 text-left">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {properties.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Sin propiedades aún. ¡Crea la primera!
                    </td>
                  </tr>
                )}
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{p.titulo}</td>
                    <td className="px-5 py-4 text-slate-300 hidden sm:table-cell capitalize">
                      {p.tipo_transaccion}
                    </td>
                    <td className="px-5 py-4 text-slate-300 hidden md:table-cell">
                      ${Number(p.precio).toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-4 text-slate-400 hidden lg:table-cell">
                      {p.tamaño_m2 ? `${p.tamaño_m2} m²` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.estado]}`}>
                        {STATUS_OPTS.find((s) => s.value === p.estado)?.label ?? p.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, icon, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-slate-300 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}

