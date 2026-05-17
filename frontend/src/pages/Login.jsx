import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { errorMessage } from '../lib/format'
import AuthShell from '../components/AuthShell'

const Icon = {
  Mail: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Eye: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  Spinner: (p) => <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/api/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setTokens(data.access_token, data.refresh_token)
      const me = await api.get('/api/users/me')
      setUser(me.data)
      toast.success('Welcome back!')
      navigate('/')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setLoading(false) }
  }

  const useDemo = () => {
    setEmail('demo@shopwave.test')
    setPassword('demopassword')
  }

  return (
    <AuthShell
      mode="login"
      title="Sign in to your account"
      subtitle="Enter your credentials to continue."
      footer={<>New to Shopwave? <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create an account →</Link></>}
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
        <div className="relative group">
          <Icon.Lock width="16" height="16" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition" />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
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

        {/* Remember + forgot */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <span className={`relative w-9 h-5 rounded-full transition ${remember ? 'bg-brand-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${remember ? 'translate-x-4' : ''}`} />
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only" />
            </span>
            <span className="text-slate-600 group-hover:text-slate-800">Remember me</span>
          </label>
          <button type="button" className="text-brand-600 hover:text-brand-700 font-medium">Forgot password?</button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="relative w-full overflow-hidden group bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-500 hover:from-brand-700 hover:to-accent-600 text-white font-semibold py-3.5 rounded-xl shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)] hover:shadow-[0_15px_40px_-10px_rgba(236,72,153,0.6)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (<><Icon.Spinner width="18" height="18" /> Signing in…</>) : (<>Sign in <Icon.Arrow width="16" height="16" className="group-hover:translate-x-1 transition-transform" /></>)}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">or</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>

        {/* Demo button */}
        <button
          type="button"
          onClick={useDemo}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 bg-white/40 hover:bg-white/80 hover:border-brand-400 text-slate-700 hover:text-brand-700 font-medium text-sm transition"
        >
          Try the demo account
        </button>
      </form>
    </AuthShell>
  )
}
