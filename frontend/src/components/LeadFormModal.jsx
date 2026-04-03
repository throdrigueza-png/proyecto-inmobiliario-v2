import { useState } from 'react'
import { X, Phone, MapPin, Users, CheckCircle } from 'lucide-react'
import { createLead } from '../api'

const COMO_OPCIONES = [
  { value: 'redes_sociales', label: 'Redes sociales' },
  { value: 'familia', label: 'Familia' },
  { value: 'conocidos', label: 'Conocidos / Amigos' },
  { value: 'busqueda_web', label: 'Búsqueda en internet' },
  { value: 'otro', label: 'Otro' },
]

/**
 * Modal that forces logged-in users without a lead profile to fill in
 * their contact data before viewing property details.
 *
 * Props:
 *   onSuccess(lead) – called after data is saved successfully
 *   onClose()       – called when the user dismisses the modal
 */
export default function LeadFormModal({ onSuccess, onClose }) {
  const [form, setForm] = useState({ telefono: '', direccion: '', como_nos_conocio: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await createLead(form)
      onSuccess(res.data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map((d) => d.msg || String(d)).join('; ') : detail || 'Error guardando datos. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={20} className="text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-white">Un paso más</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Para ver los detalles de esta propiedad, déjanos tus datos de contacto. Solo te lo pedimos una vez.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-red-300 text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Phone */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-slate-300 text-xs font-medium uppercase tracking-wide">
                <Phone size={12} /> Teléfono *
              </span>
              <input
                required
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="input-dark"
                placeholder="+34 600 000 000"
              />
            </label>

            {/* Address */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-slate-300 text-xs font-medium uppercase tracking-wide">
                <MapPin size={12} /> Dirección *
              </span>
              <input
                required
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="input-dark"
                placeholder="Calle, ciudad, país"
              />
            </label>

            {/* How they found us */}
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-slate-300 text-xs font-medium uppercase tracking-wide">
                <Users size={12} /> ¿Cómo nos conociste? *
              </span>
              <select
                required
                value={form.como_nos_conocio}
                onChange={(e) => setForm({ ...form, como_nos_conocio: e.target.value })}
                className="input-dark"
              >
                <option value="">Selecciona una opción…</option>
                {COMO_OPCIONES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 text-black font-semibold py-3 rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #9B7E28)', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}
            >
              {loading ? 'Guardando…' : 'Ver propiedad →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
