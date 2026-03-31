import { useState } from 'react'
import { Heart, Tag, Maximize2, MapPin, Images } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { toggleFavorite } from '../api'
import PropertyModal from './PropertyModal'

// Named motion component (makes ESLint happy with member-expression usage)
const MotionArticle = motion.article

const STATUS_LABELS = {
  disponible: { label: 'Disponible', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  arrendado:  { label: 'Arrendado',  bg: 'bg-amber-500',   ring: 'ring-amber-500/30'   },
  vendido:    { label: 'Vendido',    bg: 'bg-red-500',     ring: 'ring-red-500/30'     },
  reservado:  { label: 'Reservado',  bg: 'bg-purple-500',  ring: 'ring-purple-500/30'  },
}

const TIPO_LABELS = {
  venta:    { label: 'Venta',    gradient: 'from-[#0078d4] to-[#004880]' },
  arriendo: { label: 'Arriendo', gradient: 'from-[#7c3aed] to-[#5b21b6]' },
}

export default function PropertyCard({ property, index = 0, initialFavorited = false, onLoginRequired }) {
  const { user, isAdmin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [favLoading, setFavLoading] = useState(false)

  const coverImage = property.images?.[0] ?? null
  const imageCount = property.images?.length ?? 0

  const status = STATUS_LABELS[property.estado] ?? STATUS_LABELS.disponible
  const tipo   = TIPO_LABELS[property.tipo_transaccion] ?? TIPO_LABELS.venta

  const handleFavorite = async (e) => {
    e.stopPropagation()
    if (!user) {
      onLoginRequired?.()
      return
    }
    if (isAdmin) return
    setFavLoading(true)
    const next = !favorited
    setFavorited(next) // optimistic update
    try {
      await toggleFavorite(property.id)
    } catch (err) {
      console.error('[Favorites] Toggle failed:', err)
      setFavorited(!next) // revert on error
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <>
      <MotionArticle
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
        className="card-glow group relative rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          background: 'linear-gradient(145deg, #0d2137 0%, #091526 100%)',
          border: '1px solid rgba(0,120,212,0.15)',
        }}
        onClick={() => setModalOpen(true)}
      >
        {/* ── Cover image ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ height: '240px' }}>
          <img
            src={coverImage || 'https://placehold.co/600x400/0d2137/2b8be0?text=Sin+imagen'}
            alt={property.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            draggable={false}
          />

          {/* Strong gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#091526] via-[#091526]/30 to-transparent pointer-events-none" />

          {/* Top-left: tipo badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${tipo.gradient} shadow-lg`}>
              {tipo.label}
            </span>
          </div>

          {/* Top-right: heart button (non-admin users) */}
          {!isAdmin && (
            <button
              onClick={handleFavorite}
              disabled={favLoading}
              aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200 ${
                favorited
                  ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/40'
                  : 'bg-black/50 text-white hover:bg-red-500/80 hover:scale-105'
              }`}
            >
              <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
            </button>
          )}

          {/* Bottom-left: status badge */}
          <span
            className={`absolute bottom-14 left-3 z-10 text-xs font-semibold px-2.5 py-1 rounded-full text-white ring-2 ${status.bg} ${status.ring}`}
          >
            {status.label}
          </span>

          {/* Bottom-right: image count (when > 1) */}
          {imageCount > 1 && (
            <div className="absolute bottom-14 right-3 z-10 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              <Images size={11} />
              <span>{imageCount}</span>
            </div>
          )}

          {/* Bottom overlay: title + price */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-1 mb-1.5 group-hover:text-[#56a4ea] transition-colors duration-200">
              {property.titulo}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag size={13} className="text-[#56a4ea]" />
                <span className="text-white font-bold text-sm">
                  ${Number(property.precio).toLocaleString('es-CO')}
                </span>
              </div>
              {property.tamaño_m2 && (
                <div className="flex items-center gap-1">
                  <Maximize2 size={11} className="text-[#56a4ea]" />
                  <span className="text-slate-300 text-xs">{property.tamaño_m2} m²</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Card footer ──────────────────────────────────────────────────── */}
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          {property.direccion ? (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs flex-1 min-w-0">
              <MapPin size={12} className="flex-shrink-0 text-[#0078d4]" />
              <span className="truncate">{property.direccion}</span>
            </div>
          ) : (
            <span className="text-slate-600 text-xs">Sin dirección</span>
          )}
          <span className="text-[#56a4ea] text-xs font-semibold flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
            Ver más →
          </span>
        </div>

        {/* Bottom azure accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#0078d4]/40 to-transparent" />
      </MotionArticle>

      {/* Property detail modal */}
      {modalOpen && (
        <PropertyModal property={property} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}


