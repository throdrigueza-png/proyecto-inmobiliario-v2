import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Building2, MessageCircle, ArrowLeft, CheckSquare, Square, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import { getValuationModifiers } from '../api'

const MotionDiv = motion.div

const AGENT_PHONE = import.meta.env.VITE_AGENT_PHONE || '34658062023'

export default function Tasacion() {
  const [basePrice, setBasePrice] = useState(120000)
  const [modifiers, setModifiers] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loadingModifiers, setLoadingModifiers] = useState(true)

  useEffect(() => {
    getValuationModifiers()
      .then((res) => setModifiers(res.data))
      .catch(() => {})
      .finally(() => setLoadingModifiers(false))
  }, [])

  const totalPrice = modifiers.reduce((acc, mod) => {
    if (!selected.has(mod.id)) return acc
    if (mod.tipo_operacion === 'porcentaje') {
      return acc + (acc * mod.valor_adicional) / 100
    }
    return acc + mod.valor_adicional
  }, basePrice)

  const toggleModifier = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const whatsappMsg = encodeURIComponent(
    `Hola, me gustaría agendar una cita para tasar mi propiedad. Precio estimado: €${Math.round(totalPrice).toLocaleString('es-ES')}. ¿Cuándo podríamos hablar?`
  )
  const whatsappUrl = `https://wa.me/${AGENT_PHONE}?text=${whatsappMsg}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-[#F0C040]"
          style={{ color: '#4a6480' }}
        >
          <ArrowLeft size={14} /> Volver al catálogo
        </Link>

        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <Calculator size={20} className="text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Herramienta de Tasación</h1>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Obtén una estimación del valor de tu propiedad. Introduce el precio base y selecciona las características adicionales.
            Para una valoración más exacta, agenda una cita con nosotros.
          </p>
        </MotionDiv>

        {/* Base price input */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-5 mb-5"
          style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-slate-300 text-xs font-medium uppercase tracking-wide">
              <Building2 size={13} className="text-[#D4AF37]" />
              Precio base estimado (€)
            </span>
            <input
              type="number"
              min="0"
              step="1000"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
              className="input-dark text-lg font-semibold"
              placeholder="120000"
            />
            <span className="text-slate-500 text-xs">
              Precio de referencia para la zona (sin extras). El promedio en la Costa Blanca empieza en ~120.000 €.
            </span>
          </label>
        </MotionDiv>

        {/* Modifiers */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl p-5 mb-5"
          style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          <p className="flex items-center gap-2 text-slate-300 text-xs font-medium uppercase tracking-wide mb-4">
            <TrendingUp size={13} className="text-[#D4AF37]" />
            Características adicionales
          </p>

          {loadingModifiers ? (
            <p className="text-slate-500 text-sm animate-pulse">Cargando características…</p>
          ) : modifiers.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No hay características configuradas aún. El administrador puede añadirlas desde el panel.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {modifiers.map((mod) => {
                const isChecked = selected.has(mod.id)
                const valueLabel =
                  mod.tipo_operacion === 'porcentaje'
                    ? `+${mod.valor_adicional}%`
                    : `+€${Number(mod.valor_adicional).toLocaleString('es-ES')}`
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModifier(mod.id)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      isChecked
                        ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/50'
                        : 'border border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isChecked
                        ? <CheckSquare size={16} className="text-[#D4AF37] flex-shrink-0" />
                        : <Square size={16} className="text-slate-500 flex-shrink-0" />}
                      <span className={`text-sm font-medium ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                        {mod.nombre}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isChecked ? 'bg-[#D4AF37]/20 text-[#F0C040]' : 'bg-slate-700/50 text-slate-400'}`}>
                      {valueLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </MotionDiv>

        {/* Result */}
        <MotionDiv
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl p-6 mb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(155,126,40,0.08) 100%)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <p className="text-slate-400 text-sm mb-1">Valor estimado de tu propiedad</p>
          <p
            className="text-4xl font-extrabold mb-1"
            style={{ background: 'linear-gradient(135deg, #F0C040, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            €{Math.round(totalPrice).toLocaleString('es-ES')}
          </p>
          <p className="text-slate-500 text-xs">Estimación orientativa basada en los datos introducidos</p>
        </MotionDiv>

        {/* CTA */}
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex flex-col gap-3"
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-green-500/30 active:scale-95 text-base"
          >
            <MessageCircle size={18} />
            Agenda una cita para valoración exacta
          </a>
          <p className="text-center text-slate-500 text-xs">
            Para un valor más preciso, nuestros expertos realizan una valoración presencial gratuita.
          </p>
        </MotionDiv>
      </div>
    </div>
  )
}
