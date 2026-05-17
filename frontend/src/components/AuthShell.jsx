import { Link } from 'react-router-dom'

// Reusable shell for Login / Register pages — animated gradient bg, floating blobs,
// drifting particles and a glow-ring glass card. Keeps the form pages thin.

const Icon = {
  Bolt: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  Shield: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>,
  Sparkle: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>,
  Truck: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  Star: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
}

const PARTICLE_COUNT = 18

export default function AuthShell({
  mode = 'login',          // 'login' | 'register'
  title,
  subtitle,
  children,                // the actual form
  footer,                  // bottom <p>...</p>
}) {
  const isLogin = mode === 'login'

  const features = isLogin
    ? [
        { icon: <Icon.Bolt width="16" height="16" />, text: 'Lightning-fast checkout' },
        { icon: <Icon.Truck width="16" height="16" />, text: 'Live order tracking' },
        { icon: <Icon.Shield width="16" height="16" />, text: 'Secure encrypted login' },
      ]
    : [
        { icon: <Icon.Sparkle width="16" height="16" />, text: 'AI-powered recommendations' },
        { icon: <Icon.Truck width="16" height="16" />, text: 'Free 30-day returns' },
        { icon: <Icon.Shield width="16" height="16" />, text: 'Bank-grade security' },
      ]

  return (
    <div className="relative -mx-4 -my-8 min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated mesh gradient + grid background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-brand-50 to-pink-50 animate-gradient" />
      <div className="absolute inset-0 bg-grid opacity-60" />
      {/* Floating blobs */}
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-brand-400/40 blur-3xl animate-float-blob" style={{ animationDelay: '0s' }} />
      <div className="absolute top-1/3 -right-20 w-[28rem] h-[28rem] rounded-full bg-accent-400/40 blur-3xl animate-float-blob" style={{ animationDelay: '-4s' }} />
      <div className="absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-indigo-300/40 blur-3xl animate-float-blob" style={{ animationDelay: '-9s' }} />

      {/* Drifting sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
          const left = (i * 53) % 100
          const dur = 12 + (i % 7) * 2.5
          const delay = -(i * 1.7)
          const size = 4 + (i % 5)
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.7)] animate-drift"
              style={{
                left: `${left}%`,
                width: size, height: size,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
              }}
            />
          )
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-16 grid lg:grid-cols-2 gap-10 items-center min-h-[calc(100vh-4rem)]">

        {/* LEFT — marketing panel */}
        <div className="hidden lg:block animate-pop-in">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-white flex items-center justify-center font-extrabold shadow-soft group-hover:scale-105 transition">
              S
            </span>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brand-700 to-accent-600 bg-clip-text text-transparent">
              Shopwave
            </span>
          </Link>

          <h1 className="text-5xl font-extrabold leading-tight mb-5">
            <span className="bg-gradient-to-r from-slate-900 via-brand-700 to-accent-600 bg-clip-text text-transparent">
              {isLogin ? 'Welcome back.' : 'Start shopping smarter.'}
            </span>
            <br />
            <span className="text-slate-700">
              {isLogin ? 'Your cart is waiting.' : 'Built for the modern you.'}
            </span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed max-w-md mb-8">
            {isLogin
              ? 'Sign in to track every order, save favorites and chat with Maya — our human-feel AI shopping assistant.'
              : 'Join thousands of shoppers enjoying curated recommendations, lightning checkout and 24/7 support.'}
          </p>

          {/* Feature pills */}
          <ul className="space-y-3 mb-8">
            {features.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 animate-pop-in"
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                <span className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur border border-white shadow-soft text-brand-600 flex items-center justify-center">
                  {f.icon}
                </span>
                <span className="text-slate-700 font-medium">{f.text}</span>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="flex items-center gap-4 p-4 rounded-2xl glass border border-white shadow-soft animate-pop-in" style={{ animationDelay: '0.7s' }}>
            <div className="flex -space-x-2">
              {['eab308', 'ec4899', '6366f1', '10b981'].map((c, i) => (
                <div key={i} className="w-9 h-9 rounded-full ring-2 ring-white" style={{ background: `#${c}` }} />
              ))}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-0.5 text-amber-400 mb-0.5">
                {Array.from({ length: 5 }).map((_, i) => <Icon.Star key={i} width="13" height="13" />)}
                <span className="text-slate-700 text-sm font-semibold ml-1.5">4.9</span>
              </div>
              <div className="text-xs text-slate-600">Loved by <span className="font-semibold">12,400+</span> happy shoppers worldwide</div>
            </div>
          </div>
        </div>

        {/* RIGHT — form card */}
        <div className="relative animate-pop-in" style={{ animationDelay: '0.1s' }}>
          {/* Glow ring wrapper */}
          <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-brand-500/60 via-accent-500/40 to-brand-400/60 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.5)]">
            <div className="relative rounded-[1.4rem] glass shine-wrap p-8 sm:p-10">

              {/* Top tab switcher */}
              <div className="flex gap-1 p-1 bg-slate-100/80 rounded-xl mb-7 text-sm font-medium">
                <Link
                  to="/login"
                  className={`flex-1 text-center py-2 rounded-lg transition ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >Sign in</Link>
                <Link
                  to="/register"
                  className={`flex-1 text-center py-2 rounded-lg transition ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >Create account</Link>
              </div>

              <div className="lg:hidden flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white flex items-center justify-center font-extrabold text-sm">S</span>
                <span className="font-extrabold text-lg">Shopwave</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{title}</h2>
              <p className="text-sm text-slate-500 mb-6">{subtitle}</p>

              {children}

              {footer && (
                <p className="text-sm text-slate-500 mt-6 text-center">{footer}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
