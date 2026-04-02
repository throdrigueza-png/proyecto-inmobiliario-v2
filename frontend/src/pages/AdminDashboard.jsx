import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Plus, Pencil, Trash2, CheckCircle, X,
  Building2, Tag, Maximize2, MapPin, ImageIcon, Images,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getProperties, createProperty, updateProperty, deleteProperty, getUsers, uploadImages } from '../api'
import { useAuth } from '../contexts/AuthContext'

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  precio: '',
  tamaño_m2: '',
  direccion: '',
  latitud: '',
  longitud: '',
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
  disponible: 'bg-[#D4AF37]/20 text-[#F0C040]',
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
  const [geocodingFailed, setGeocodingFailed] = useState(false)

  // Multi-image upload state
  // existingImageUrls: already-uploaded URLs (from Cloudinary) kept from a previous save
  // newImageFiles / newImagePreviews: newly selected files (not yet uploaded)
  const [existingImageUrls, setExistingImageUrls] = useState([])
  const [newImageFiles, setNewImageFiles] = useState([])
  const [newImagePreviews, setNewImagePreviews] = useState([])
  const [uploading, setUploading] = useState(false)

  const totalImages = existingImageUrls.length + newImageFiles.length

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

  // Auto-geocode the address using Nominatim (OpenStreetMap) — no API key needed.
  // Debounced 600 ms so we don't hammer the service on every keystroke.
  // Minimum 5 characters: shorter strings never return useful geocoding results.
  useEffect(() => {
    if (!form.direccion || form.direccion.trim().length < 5) return

    const timer = setTimeout(async () => {
      try {
        // Nominatim usage policy requires identifying the application.
        // Browsers cannot override User-Agent, so we send Referer instead.
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(form.direccion)}`,
          { headers: { 'Accept-Language': 'es', Referer: window.location.origin } },
        )
        const data = await res.json()
        if (data.length > 0) {
          setGeocodingFailed(false)
          setForm((prev) => ({
            ...prev,
            latitud: parseFloat(data[0].lat),
            longitud: parseFloat(data[0].lon),
          }))
        } else {
          setGeocodingFailed(true)
        }
      } catch {
        setGeocodingFailed(true)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [form.direccion])

  const notify = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    newImagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setExistingImageUrls([])
    setNewImageFiles([])
    setNewImagePreviews([])
    setGeocodingFailed(false)
  }

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const available = 10 - totalImages
    if (available <= 0) {
      setError('Ya tienes 10 imágenes. Elimina alguna antes de agregar más.')
      e.target.value = ''
      return
    }
    const accepted = selected.slice(0, available)
    if (accepted.length < selected.length) {
      setError(`Solo se permiten 10 imágenes en total. Se agregaron ${accepted.length} de ${selected.length} seleccionadas.`)
    }
    const previews = accepted.map((f) => URL.createObjectURL(f))
    setNewImageFiles((prev) => [...prev, ...accepted])
    setNewImagePreviews((prev) => [...prev, ...previews])
    e.target.value = '' // reset input so same files can be re-selected after removal
  }

  const removeExistingImage = (idx) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const removeNewImage = (idx) => {
    URL.revokeObjectURL(newImagePreviews[idx])
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    let uploadedUrls = []

    // Upload any newly selected image files to Cloudinary
    if (newImageFiles.length > 0) {
      setUploading(true)
      try {
        const res = await uploadImages(newImageFiles)
        uploadedUrls = res.data.urls
      } catch (err) {
        const detail = err.response?.data?.detail || 'Verifica la configuración de Cloudinary en el servidor.'
        setError(`Error subiendo imágenes: ${detail}`)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const finalImages = [...existingImageUrls, ...uploadedUrls]

    const payload = {
      ...form,
      precio: parseFloat(form.precio),
      tamaño_m2: form.tamaño_m2 ? parseFloat(form.tamaño_m2) : null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      owner_id: parseInt(form.owner_id),
      images: finalImages,
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
      tipo_transaccion: p.tipo_transaccion ?? 'venta',
      estado: p.estado,
      owner_id: p.owner_id,
    })
    // Validate existing image URLs before trusting them
    const safeUrls = (p.images || []).filter((u) => /^https?:/.test(u))
    setExistingImageUrls(safeUrls)
    setNewImageFiles([])
    setNewImagePreviews([])
    setGeocodingFailed(false)
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
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-[#D4AF37]" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administrador</h1>
              <p className="text-slate-400 text-sm">Costa Blanca Inmuebles</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditId(null)
              setForm(EMPTY_FORM)
              setExistingImageUrls([])
              setNewImageFiles([])
              setNewImagePreviews([])
              setGeocodingFailed(false)
            }}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F0C040] text-black font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={18} /> Nueva propiedad
          </button>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-4 flex items-center gap-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F0C040] px-4 py-3 rounded-xl">
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
            <div key={s.value} className="rounded-2xl p-5" style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="text-slate-400 text-sm mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-white">{statusCounts[s.value] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Property form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto" style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.25)' }}>
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
                  <Field label="Precio (EUR) *" icon={<Tag size={14} />}>
                    <input
                      required
                      type="number"
                      step="1000"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      className="input-dark"
                      placeholder="250000"
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

                {/* Address — Nominatim (OpenStreetMap) auto-geocodes on input */}
                <Field label="Dirección" icon={<MapPin size={14} />}>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="input-dark"
                    placeholder="Calle Gran Vía 1, Madrid, España"
                    autoComplete="off"
                  />
                  {/* Coordinates status indicator */}
                  {form.latitud && form.longitud ? (
                    <span className="flex items-center gap-1 text-[#D4AF37] text-xs mt-1">
                      <MapPin size={11} />
                      Coordenadas detectadas ({Number(form.latitud).toFixed(5)}, {Number(form.longitud).toFixed(5)})
                    </span>
                  ) : geocodingFailed ? (
                    <span className="text-amber-400 text-xs mt-1">
                      No se encontraron coordenadas para esta dirección. Intenta con una dirección más completa.
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs mt-1">
                      Escribe la dirección completa para detectar las coordenadas automáticamente
                    </span>
                  )}
                </Field>

                {/* Multi-image upload (up to 10) */}
                <Field label={`Fotos del predio (${totalImages}/10)`} icon={<Images size={14} />}>
                  <div className="flex flex-col gap-3">
                    {/* Image thumbnails grid */}
                    {(existingImageUrls.length > 0 || newImagePreviews.length > 0) && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {/* Existing URLs */}
                        {existingImageUrls.map((url, idx) => (
                          <div key={`existing-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 group/thumb">
                            <img
                              src={/^https?:/.test(url) ? url : ''}
                              alt={`Imagen ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-[#D4AF37]/90 text-white py-0.5">
                                Portada
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExistingImage(idx)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/90 text-white rounded-full p-0.5 transition-colors opacity-0 group-hover/thumb:opacity-100"
                              aria-label="Eliminar imagen"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        {/* New file previews */}
                        {newImagePreviews.map((preview, idx) => {
                          const overallIdx = existingImageUrls.length + idx
                          return (
                            <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-[#D4AF37]/50 group/thumb">
                              <img
                                src={/^(blob:|https?:)/.test(preview) ? preview : ''}
                                alt={`Nueva imagen ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {overallIdx === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-[#D4AF37]/90 text-white py-0.5">
                                  Portada
                                </span>
                              )}
                              <span className="absolute top-1 left-1 bg-[#D4AF37]/80 text-white rounded-full w-[14px] h-[14px] flex items-center justify-center text-[9px]">
                                ↑
                              </span>
                              <button
                                type="button"
                                onClick={() => removeNewImage(idx)}
                                className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/90 text-white rounded-full p-0.5 transition-colors opacity-0 group-hover/thumb:opacity-100"
                                aria-label="Eliminar imagen"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* File picker */}
                    {totalImages < 10 && (
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-xl p-4 cursor-pointer transition-colors group/drop">
                        <ImageIcon size={20} className="text-[#D4AF37]/60 group-hover/drop:text-[#D4AF37] transition-colors" />
                        <span className="text-slate-400 text-xs text-center">
                          {totalImages === 0
                            ? 'Selecciona hasta 10 fotos'
                            : `Agregar más fotos (${10 - totalImages} disponibles)`}
                        </span>
                        <span className="text-[#F0C040] text-xs font-medium">
                          La primera foto será la portada de la card
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}

                    {totalImages >= 10 && (
                      <p className="text-amber-400 text-xs text-center py-2">
                        Límite de 10 imágenes alcanzado. Elimina alguna para agregar más.
                      </p>
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
                  className="mt-2 bg-[#D4AF37] hover:bg-[#F0C040] disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors"
                >
                  {uploading ? 'Subiendo imágenes…' : editId ? 'Guardar cambios' : 'Crear propiedad'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-center text-slate-400 py-20 animate-pulse">Cargando…</p>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
            <table className="w-full text-sm">
              <thead className="text-slate-400 uppercase text-xs tracking-wider" style={{ background: '#050505' }}>
                <tr>
                  <th className="px-5 py-4 text-left">Título</th>
                  <th className="px-5 py-4 text-left hidden sm:table-cell">Tipo</th>
                  <th className="px-5 py-4 text-left hidden md:table-cell">Precio</th>
                  <th className="px-5 py-4 text-left hidden lg:table-cell">Tamaño</th>
                  <th className="px-5 py-4 text-left">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {properties.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Sin propiedades aún. ¡Crea la primera!
                    </td>
                  </tr>
                )}
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-[#D4AF37]/5 transition-colors" style={{ background: '#0a0a0a' }}>
                    <td className="px-5 py-4 text-white font-medium">{p.titulo}</td>
                    <td className="px-5 py-4 text-slate-300 hidden sm:table-cell capitalize">
                      {p.tipo_transaccion}
                    </td>
                    <td className="px-5 py-4 text-slate-300 hidden md:table-cell">
                      €{Number(p.precio).toLocaleString('es-ES')}
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#F0C040] hover:bg-[#D4AF37]/10 transition-colors"
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

