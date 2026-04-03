import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Mail, Lock, LogIn, Chrome, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { createUser } from '../api'

// Named motion component (makes ESLint happy with member-expression usage)
const MotionDiv = motion.div
const MotionP = motion.p

export default function Login() {
  const navigate = useNavigate()
  const { login, loginGoogle } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const googleInitialized = useRef(false)

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      console.warn(
        '[Auth] VITE_GOOGLE_CLIENT_ID no está definida. ' +
          'Asegúrate de configurarla como GitHub Secret para que el build de producción la incluya.'
      )
    }
    if (googleInitialized.current || !window.google?.accounts?.id) return
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '181911766292-np707bhan426aud7fnfd6m338582d7us.apps.googleusercontent.com'
    window.google.accounts.id.initialize({
      client_id: clientId,
      use_fedcm_for_prompt: true,
      callback: async ({ credential }) => {
        try {
          setLoading(true)
          await loginGoogle(credential)
          navigate('/')
        } catch {
          setError('No se pudo iniciar sesión con Google.')
        } finally {
          setLoading(false)
        }
      },
    })
    googleInitialized.current = true
  }, [loginGoogle, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'register') {
        await createUser({ nombre: form.nombre, email: form.email, password: form.password })
        await login(form.email, form.password)
      } else {
        await login(form.email, form.password)
      }
      navigate('/')
    } catch (err) {
      const detail = err?.response?.data?.detail
      // Pydantic v2 returns detail as an array of validation errors
      let msg
      if (Array.isArray(detail)) {
        msg = detail.map((d) => d.msg || d.message || String(d)).join('; ')
      } else if (typeof detail === 'string') {
        msg = detail
      } else {
        msg = mode === 'register'
          ? 'Error inesperado al crear la cuenta. Inténtalo de nuevo.'
          : 'Credenciales incorrectas. Inténtalo de nuevo.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    if (!window.google?.accounts?.id) {
      setError('El servicio de Google no está disponible. Recarga la página e inténtalo de nuevo.')
      return
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError('El inicio de sesión con Google fue cancelado o bloqueado. Intenta de nuevo.')
      }
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,175,55,0.4) 0%, transparent 70%)' }}
      />

      <MotionDiv
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9B7E28] flex items-center justify-center shadow-lg shadow-[#D4AF37]/40">
              <Building2 size={22} className="text-black" />
            </div>
            <span className="font-bold text-xl text-white group-hover:text-[#F0C040] transition-colors">
              Costa Blanca <span className="text-[#D4AF37]">Inmuebles</span>
            </span>
          </Link>
        </div>

        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(5,5,5,0.85)',
            border: '1px solid rgba(212,175,55,0.2)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Mode tabs */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(212,175,55,0.15)' }}
          >
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={
                  mode === m
                    ? { background: 'linear-gradient(135deg, #D4AF37, #9B7E28)', color: '#fff', boxShadow: '0 4px 12px rgba(212,175,55,0.35)' }
                    : { color: '#4a6480' }
                }
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {error && (
            <MotionP
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-300 text-sm px-4 py-3 rounded-xl mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {error}
            </MotionP>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Nombre completo</span>
                <input
                  required
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="input-dark"
                  placeholder="Tu nombre"
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                <Mail size={11} /> Email
              </span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-dark"
                placeholder="tucorreo@ejemplo.com"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                <Lock size={11} /> Contraseña
              </span>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-dark"
                placeholder="••••••••"
                minLength={6}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #9B7E28)', boxShadow: '0 4px 20px rgba(212,175,55,0.4)' }}
            >
              <LogIn size={17} />
              {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(212,175,55,0.2)' }} />
            <span className="text-slate-500 text-xs">o</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(212,175,55,0.2)' }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            style={{ border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)' }}
          >
            <Chrome size={17} />
            Continuar con Google
          </button>
        </div>

        <p className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[#F0C040]"
            style={{ color: '#4a6480' }}
          >
            <ArrowLeft size={14} /> Volver al catálogo
          </Link>
        </p>
      </MotionDiv>
    </div>
  )
}

