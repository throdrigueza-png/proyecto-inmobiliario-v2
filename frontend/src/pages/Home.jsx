import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, MessageCircle, Instagram, Facebook, TrendingUp, Shield, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import PropertyCard from '../components/PropertyCard'
import ParticlesBackground from '../components/ParticlesBackground'
import { getProperties, getFavorites } from '../api'
import { useAuth } from '../contexts/AuthContext'

// Named motion components (makes ESLint happy with member-expression usage)
const MotionDiv = motion.div
const MotionH1 = motion.h1
const MotionP = motion.p

const AGENT_PHONE = import.meta.env.VITE_AGENT_PHONE || '34658062023'
const AGENT_WHATSAPP = `https://wa.me/${AGENT_PHONE}?text=${encodeURIComponent('Hola, estoy interesado/a en sus propiedades. ¿Me puede dar más información?')}`
const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com'
const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com'

const TRANSACTION_TYPES = [
  { value: '', label: 'Todo' },
  { value: 'venta', label: 'Venta' },
  { value: 'arriendo', label: 'Arriendo' },
]

const STATUSES = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arrendado', label: 'Arrendado' },
]

const STATS = [
  { icon: TrendingUp, value: '100%', label: 'Compromiso con el cliente' },
  { icon: Shield,     value: 'Seguro', label: 'Asesoría de confianza' },
  { icon: Star,       value: '5★',    label: 'Experiencia de calidad' },
]

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.1)' }}>
      <div className="h-52 shimmer" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-5 shimmer rounded-lg w-3/4" />
        <div className="h-4 shimmer rounded-lg w-1/2" />
        <div className="h-3 shimmer rounded-lg w-full" />
        <div className="h-3 shimmer rounded-lg w-5/6" />
        <div className="h-10 shimmer rounded-xl mt-auto" />
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [properties, setProperties] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getProperties()
      .then((res) => setProperties(res.data))
      .catch(() => setError('No se pudieron cargar las propiedades.'))
      .finally(() => setLoading(false))
  }, [])

  // Load the current user's favorites (non-admin only)
  useEffect(() => {
    if (!user || isAdmin) return
    getFavorites()
      .then((res) => setFavoriteIds(new Set(res.data.favorite_ids)))
      .catch((err) => console.error('[Favorites] Could not load favorites:', err)) // non-critical
  }, [user, isAdmin])

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.direccion ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter ? p.tipo_transaccion === typeFilter : true
    const matchStatus = statusFilter ? p.estado === statusFilter : true
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden" style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Particles */}
        <ParticlesBackground />

        {/* Background layers */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #000000 0%, #0d0b00 40%, #000000 100%)' }} />
          {/* Radial glow */}
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.35) 0%, transparent 70%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
          {/* Badge */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', color: '#F0C040' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            Agencia Inmobiliaria Premium
          </MotionDiv>

          {/* Headline */}
          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-5 leading-tight"
          >
            Tu próximo hogar<br />
            <span style={{ background: 'linear-gradient(135deg, #F0C040, #D4AF37, #9B7E28)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              te está esperando
            </span>
          </MotionH1>

          {/* Subtitle */}
          <MotionP
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Casas, apartamentos y locales para venta y arriendo.
            Te acompañamos en cada paso de tu proceso inmobiliario con total transparencia.
          </MotionP>

          {/* Search & filters */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-10"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" size={17} />
              <input
                type="text"
                placeholder="Buscar por título, dirección o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-dark w-full pl-10 pr-4 py-3.5 text-sm"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" size={16} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-dark pl-10 pr-4 py-3.5 appearance-none cursor-pointer"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-dark py-3.5 px-4 appearance-none cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </MotionDiv>

          {/* Social links */}
          <MotionDiv
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <a
              href={AGENT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(59,89,152,0.8)', border: '1px solid rgba(59,89,152,0.5)' }}
            >
              <Facebook size={16} /> Facebook
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(193,53,132,0.7)', border: '1px solid rgba(193,53,132,0.4)' }}
            >
              <Instagram size={16} /> Instagram
            </a>
          </MotionDiv>
        </div>

        {/* Stats strip */}
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative z-10 max-w-3xl mx-auto w-full px-4 pb-10"
        >
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((stat) => {
              const StatIcon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="text-center py-4 px-3 rounded-2xl"
                  style={{ background: 'rgba(5,5,5,0.7)', border: '1px solid rgba(212,175,55,0.2)', backdropFilter: 'blur(12px)' }}
                >
                  <StatIcon size={20} className="text-[#D4AF37] mx-auto mb-1" />
                  <p className="text-white font-bold text-lg leading-none">{stat.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </MotionDiv>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
            <path d="M0 60L480 20L960 50L1440 10V60H0Z" fill="#000000" />
          </svg>
        </div>
      </header>

      {/* ── Catalog section ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Section header */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-2xl font-bold text-white mb-1">
            Propiedades <span style={{ background: 'linear-gradient(135deg, #F0C040, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>disponibles</span>
          </h2>
          <p className="text-slate-400 text-sm">Selecciona la propiedad que más se adapte a ti y contáctanos directamente.</p>
        </MotionDiv>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-red-400 text-lg">{error}</p>
          </MotionDiv>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Search size={28} className="text-[#D4AF37]" />
            </div>
            <p className="text-slate-300 font-medium">No se encontraron propiedades con esos filtros.</p>
            <p className="text-slate-500 text-sm mt-1">Intenta ajustar los criterios de búsqueda.</p>
          </MotionDiv>
        )}

        {/* Property grid */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-slate-500 text-xs mb-6">
              {filtered.length} propiedad{filtered.length !== 1 ? 'es' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
            </p>
            <AnimatePresence>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p, i) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    index={i}
                    initialFavorited={favoriteIds.has(p.id)}
                    onLoginRequired={() => navigate('/login')}
                  />
                ))}
              </div>
            </AnimatePresence>
          </>
        )}
      </main>

      {/* ── Floating WhatsApp ────────────────────────────────────────────────── */}
      <a
        href={AGENT_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-3 rounded-full shadow-2xl shadow-green-500/40 transition-all hover:scale-110 active:scale-95 whatsapp-pulse"
        title="Contactar por WhatsApp"
        style={{ position: 'fixed' }}
      >
        <MessageCircle size={22} />
        <span className="hidden sm:block">Contactar</span>
      </a>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="text-center py-8 text-sm"
        style={{ background: 'rgba(0,0,0,0.9)', borderTop: '1px solid rgba(212,175,55,0.15)', color: '#4a6480' }}
      >
        © {new Date().getFullYear()} Inmobiliaria Premium ·{' '}
        <span style={{ color: '#D4AF37' }}>Agencia Inmobiliaria</span>
      </footer>
    </div>
  )
}

