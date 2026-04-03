import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, MapPin, Tag, Maximize2, MessageCircle, Home } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_META = {
  disponible: { label: 'Disponible', color: 'bg-emerald-500' },
  reservado:  { label: 'Reservado',  color: 'bg-purple-500'  },
  vendido:    { label: 'Vendido',    color: 'bg-red-500'     },
}

const TIPO_VIVIENDA_META = {
  piso:    { label: 'Piso',    gradient: 'from-[#D4AF37] to-[#9B7E28]' },
  chalet:  { label: 'Chalet',  gradient: 'from-[#7c3aed] to-[#5b21b6]' },
  villa:   { label: 'Villa',   gradient: 'from-[#0369a1] to-[#075985]' },
  duplex:  { label: 'Dúplex',  gradient: 'from-[#0f766e] to-[#0d5752]' },
  local:   { label: 'Local',   gradient: 'from-[#b45309] to-[#92400e]' },
  otro:    { label: 'Otro',    gradient: 'from-[#374151] to-[#1f2937]' },
}

const AGENT_PHONE = import.meta.env.VITE_AGENT_PHONE || '34658062023'

export default function PropertyModal({ property, onClose }) {
  const [currentImage, setCurrentImage] = useState(0)
  const touchStartX = useRef(null)

  const images = property.images?.length > 0 ? property.images : []
  const totalImages = images.length

  const prevImage = () => setCurrentImage((i) => (i - 1 + totalImages) % totalImages)
  const nextImage = () => setCurrentImage((i) => (i + 1) % totalImages)

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && totalImages > 1)
        setCurrentImage((i) => (i - 1 + totalImages) % totalImages)
      if (e.key === 'ArrowRight' && totalImages > 1)
        setCurrentImage((i) => (i + 1) % totalImages)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, totalImages])

  // Touch swipe handlers
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || totalImages <= 1) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) delta > 0 ? nextImage() : prevImage()
    touchStartX.current = null
  }

  const status = STATUS_META[property.estado] ?? STATUS_META.disponible
  const tipo   = TIPO_VIVIENDA_META[property.tipo_vivienda] ?? TIPO_VIVIENDA_META.piso

  const whatsappMsg = encodeURIComponent(
    `Hola, estoy interesado/a en la propiedad "${property.titulo}"${property.direccion ? ` (${property.direccion})` : ''}. Precio: €${Number(property.precio).toLocaleString('es-ES')}. ¿Me puede dar más información?`
  )
  const phone = property.owner?.telefono?.replace(/\D/g, '') || AGENT_PHONE
  const whatsappUrl = `https://wa.me/${phone}?text=${whatsappMsg}`

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Modal sheet */}
      <div
        className="relative w-full sm:max-w-lg max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
        >
          <X size={20} />
        </button>

        {/* ── Image carousel ───────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-t-3xl sm:rounded-t-3xl"
          style={{ height: '280px' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {totalImages > 0 ? (
            <img
              src={images[currentImage]}
              alt={`${property.titulo} — imagen ${currentImage + 1}`}
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#0a0a0a' }}>
              <Home size={56} className="text-slate-600" />
            </div>
          )}

          {/* Gradient at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />

          {/* Prev / Next arrows */}
          {totalImages > 1 && (
            <>
              <button
                onClick={prevImage}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextImage}
                aria-label="Siguiente imagen"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Image counter pill */}
          {totalImages > 1 && (
            <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {currentImage + 1} / {totalImages}
            </div>
          )}

          {/* Dot indicators */}
          {totalImages > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentImage
                      ? 'bg-white w-5 h-2'
                      : 'bg-white/50 w-2 h-2 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Property details ──────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Status + tipo de vivienda badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${status.color}`}>
              {status.label}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${tipo.gradient}`}>
              {tipo.label}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {property.titulo}
          </h2>

          {/* Price + size */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-[#F0C040]" />
              <span className="text-xl font-bold text-[#F0C040]">
                €{Number(property.precio).toLocaleString('es-ES')}
              </span>
            </div>
            {property.tamaño_m2 && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Maximize2 size={14} />
                <span>{property.tamaño_m2} m²</span>
              </div>
            )}
          </div>

          {/* Address */}
          {property.direccion && (
            <div className="flex items-start gap-2 text-slate-400 text-sm">
              <MapPin size={15} className="text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span>{property.direccion}</span>
            </div>
          )}

          {/* Description */}
          {property.descripcion && (
            <p className="text-slate-300 text-sm leading-relaxed">{property.descripcion}</p>
          )}

          {/* Map */}
          {property.latitud && property.longitud && (
            <div className="rounded-2xl overflow-hidden border border-[#D4AF37]/20" style={{ height: '200px' }}>
              <MapContainer
                key={`${property.latitud}-${property.longitud}`}
                center={[property.latitud, property.longitud]}
                zoom={15}
                scrollWheelZoom={false}
                className="h-full w-full"
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[property.latitud, property.longitud]}>
                  <Popup>{property.titulo}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          {/* WhatsApp CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-green-500/30 active:scale-95 text-base mt-1"
          >
            <MessageCircle size={18} />
            Consultar por WhatsApp
          </a>

          {/* Safe bottom padding for mobile home indicator */}
          <div className="h-1 sm:hidden" />
        </div>
      </div>
    </div>
  )
}
