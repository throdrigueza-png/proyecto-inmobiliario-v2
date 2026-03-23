import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MessageCircle, MapPin, Tag, Maximize2, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import L from 'leaflet'

// Named motion component (makes ESLint happy with member-expression usage)
const MotionArticle = motion.article

// Fix default Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

const MONICA_PHONE = import.meta.env.VITE_MONICA_PHONE || '573105597895'

export default function PropertyCard({ property, index = 0 }) {
  const {
    titulo,
    descripcion,
    precio,
    tamaño_m2,
    direccion,
    url_imagen,
    latitud,
    longitud,
    estado,
    tipo_transaccion,
    owner,
  } = property

  const status = STATUS_LABELS[estado] ?? STATUS_LABELS.disponible
  const tipo   = TIPO_LABELS[tipo_transaccion] ?? TIPO_LABELS.venta

  const whatsappMsg = encodeURIComponent(
    `Hola Mónica, estoy interesado/a en la propiedad "${titulo}"${direccion ? ` ubicada en ${direccion}` : ''}. ¿Podría darme más información?`
  )
  const phone = owner?.telefono?.replace(/\D/g, '') || MONICA_PHONE
  const whatsappUrl = `https://wa.me/${phone}?text=${whatsappMsg}`

  return (
    <MotionArticle
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
      className="card-glow group relative rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(145deg, #0d2137 0%, #091526 100%)', border: '1px solid rgba(0,120,212,0.15)' }}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={url_imagen || 'https://placehold.co/600x400/0d2137/2b8be0?text=Sin+imagen'}
          alt={titulo}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#091526]/80 via-transparent to-transparent" />

        {/* Tipo badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${tipo.gradient} shadow-lg`}>
            {tipo.label}
          </span>
        </div>

        {/* Status badge */}
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full text-white ring-2 ${status.bg} ${status.ring}`}>
          {status.label}
        </span>

        {/* Price overlay on image bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#020c1b]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#0078d4]/30">
            <Tag size={14} className="text-[#56a4ea]" />
            <span className="text-white font-bold text-sm">${Number(precio).toLocaleString('es-CO')}</span>
          </div>
          {tamaño_m2 && (
            <div className="flex items-center gap-1 bg-[#020c1b]/80 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-[#0078d4]/30">
              <Maximize2 size={12} className="text-[#56a4ea]" />
              <span className="text-slate-200 text-xs font-medium">{tamaño_m2} m²</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-[#56a4ea] transition-colors duration-200">
          {titulo}
        </h3>

        {/* Address */}
        {direccion && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <MapPin size={13} className="flex-shrink-0 text-[#0078d4]" />
            <span className="line-clamp-1">{direccion}</span>
          </div>
        )}

        {descripcion && (
          <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{descripcion}</p>
        )}

        {/* Map */}
        {latitud && longitud && (
          <div className="rounded-xl overflow-hidden h-40 mt-1 border border-[#0078d4]/20">
            <MapContainer
              center={[latitud, longitud]}
              zoom={15}
              scrollWheelZoom={false}
              className="h-full w-full"
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[latitud, longitud]}>
                <Popup>{titulo}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {!latitud && !longitud && !direccion && (
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Home size={11} />
            <span>Ubicación no disponible</span>
          </div>
        )}

        {/* WhatsApp CTA */}
        <div className="mt-auto pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 w-full hover:shadow-lg hover:shadow-green-500/30 active:scale-95"
          >
            <MessageCircle size={15} />
            Consultar por WhatsApp
          </a>
        </div>
      </div>

      {/* Bottom azure accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#0078d4]/40 to-transparent" />
    </MotionArticle>
  )
}

