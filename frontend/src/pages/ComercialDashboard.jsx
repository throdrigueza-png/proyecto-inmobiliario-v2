import { useEffect, useState } from 'react'
import { Users, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import PropertyCard from '../components/PropertyCard'
import { getProperties } from '../api'

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
]

const STATUS_COLORS = {
  disponible: 'bg-emerald-500/20 text-emerald-400',
  reservado: 'bg-sky-500/20 text-sky-400',
  vendido: 'bg-red-500/20 text-red-400',
}

export default function ComercialDashboard() {
  const [properties, setProperties] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getProperties()
      .then((res) => setProperties(res.data))
      .catch(() => setError('No se pudieron cargar las propiedades.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter ? p.estado === statusFilter : true
    return matchSearch && matchStatus
  })

  const statusCounts = STATUS_OPTS.slice(1).reduce((acc, s) => {
    acc[s.value] = properties.filter((p) => p.estado === s.value).length
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="text-sky-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Panel de Comerciales</h1>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATUS_OPTS.slice(1).map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
              className={`bg-slate-800 hover:bg-slate-700 rounded-2xl p-5 text-left transition-colors border-2 ${
                statusFilter === s.value ? 'border-sky-500' : 'border-transparent'
              }`}
            >
              <p className={`text-sm mb-1 font-medium ${STATUS_COLORS[s.value]?.split(' ')[1]}`}>
                {s.label}
              </p>
              <p className="text-3xl font-bold text-white">{statusCounts[s.value] ?? 0}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar propiedad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {error && (
          <p className="text-red-400 py-8 text-center">{error}</p>
        )}

        {loading ? (
          <p className="text-center text-slate-400 py-20 animate-pulse">Cargando…</p>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">
              {filtered.length} propiedad{filtered.length !== 1 ? 'es' : ''}
            </p>
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500 py-20">Sin resultados.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
