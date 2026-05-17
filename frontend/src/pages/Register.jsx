import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { errorMessage } from '../lib/format'
import AuthShell from '../components/AuthShell'

const Icon = {
  Mail: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Eye: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12" /></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  Spinner: (p) => <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
}

function scorePassword(pw) {
  let s = 0
  if (!pw) return 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

const STRENGTH = {
  0: { label: 'Too short',  color: 'bg-slate-300',   text: 'text-slate-500' },
  1: { label: 'Weak',       color: 'bg-red-500',     text: 'text-red-600' },
  2: { label: 'Fair',       color: 'bg-amber-500',   text: 'text-amber-600' },
  3: { label: 'Good',       color: 'bg-lime-500',    text: 'text-lime-700' },
  4: { label: 'Strong',     color: 'bg-emerald-500', text: 'text-emerald-700' },
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const score = useMemo(() => scorePassword(password), [password])
  const meta = STRENGTH[score]
  const checks = useMemo(() => ({
    length:  password.length >= 8,
    case:    /[A-Z]/.test(password) && /[a-z]/.test(password),
    number:  /\d/.test(password),
    symbol:  /[^A-Za-z0-9]/.test(password),
  }), [password])

  const submit = async (e) => {
    e.preventDefault()
    if (!agree) { toast.error('Please accept the terms to continue.'); return }
    setLoading(true)
    try {
      await api.post('/api/users/register', { email, password })
      toast.success('Account created! Welcome to Shopwave.')
      navigate('/login')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setLoading(false) }
  }

  return (
    <AuthShell
      mode="register"
      title="Create your account"
      subtitle="Free forever. No credit card needed."
      footer={<>Already a member? <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in →</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Email */}
        <div className="relative group">
          <Icon.Mail width="16" height="16" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full pl-11 pr-4 py-3.5 bg-white/80 backdrop-blur border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition"
          />
        </div>

        {/* Password */}
        <div>
          <div className="relative group">
            <Icon.Lock width="16" height="16" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="Create a strong password"
              className="w-full pl-11 pr-12 py-3.5 bg-white/80 backdrop-blur border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <Icon.EyeOff width="16" height="16" /> : <Icon.Eye width="16" height="16" />}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div className="mt-3 animate-pop-in">
              <div className="flex gap-1.5 mb-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < score ? meta.color : 'bg-slate-200'}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
                <span className="text-slate-400">{password.length} chars</span>
              </div>

              {/* Requirements grid */}
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { ok: checks.length, label: '8+ characters' },
                  { ok: checks.case,   label: 'Upper + lowercase' },
                  { ok: checks.number, label: 'Includes number' },
                  { ok: checks.symbol, label: 'Includes symbol' },
                ].map((r, i) => (
                  <div key={i} className={`flex items-center gap-1.5 transition ${r.ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition ${r.ok ? 'bg-emerald-500 text-white scale-100' : 'bg-slate-200 scale-90'}`}>
                      {r.ok && <Icon.Check width="9" height="9" />}
                    </span>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="sr-only peer"
          />
          <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${agree ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
            {agree && <Icon.Check width="12" height="12" className="text-white" />}
          </span>
          <span className="text-xs text-slate-600 leading-relaxed">
            I agree to Shopwave's <a href="#" className="text-brand-600 hover:underline font-medium">Terms of Service</a> and <a href="#" className="text-brand-600 hover:underline font-medium">Privacy Policy</a>.
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agree || score < 1}
          className="relative w-full overflow-hidden group bg-gradient-to-r from-accent-500 via-pink-500 to-brand-600 hover:from-accent-600 hover:to-brand-700 text-white font-semibold py-3.5 rounded-xl shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)] hover:shadow-[0_15px_40px_-10px_rgba(99,102,241,0.6)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading
              ? (<><Icon.Spinner width="18" height="18" /> Creating account…</>)
              : (<>Create my account <Icon.Arrow width="16" height="16" className="group-hover:translate-x-1 transition-transform" /></>)}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Trust */}
        <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Icon.Lock width="11" height="11" /> Secure SSL</span>
          <span>·</span>
          <span>No spam, ever</span>
          <span>·</span>
          <span>Cancel any time</span>
        </div>
      </form>
    </AuthShell>
  )
}
