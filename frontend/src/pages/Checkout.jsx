import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { formatPrice, errorMessage } from '../lib/format'
import { useCartStore } from '../store/cart'

function formatCardNumber(v) {
  const d = v.replace(/\D/g, '').slice(0, 19)
  // Amex: 4-6-5 grouping; otherwise 4-4-4-4
  if (/^3[47]/.test(d)) return d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
  return d.replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length === 0) return ''
  if (d.length === 1) {
    return Number(d) > 1 ? `0${d}/` : d
  }
  const mm = d.slice(0, 2)
  return d.length >= 3 ? `${mm}/${d.slice(2)}` : mm
}

function detectBrand(num) {
  const d = num.replace(/\D/g, '')
  if (/^4/.test(d)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'
  if (/^3[47]/.test(d)) return 'amex'
  if (/^6(?:011|5)/.test(d)) return 'discover'
  return 'generic'
}

function luhnValid(num) {
  const d = num.replace(/\D/g, '')
  if (d.length < 12) return false
  let sum = 0, dbl = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10)
    if (dbl) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    dbl = !dbl
  }
  return sum % 10 === 0
}

const BrandLogo = ({ brand }) => {
  const baseCls = 'w-12 h-8 rounded-md text-white text-[10px] font-bold flex items-center justify-center tracking-wider'
  if (brand === 'visa') return <div className={`${baseCls} bg-[#1a1f71]`}>VISA</div>
  if (brand === 'mastercard') return <div className={`${baseCls} bg-gradient-to-r from-[#eb001b] to-[#f79e1b]`}>MC</div>
  if (brand === 'amex') return <div className={`${baseCls} bg-[#2e77bb]`}>AMEX</div>
  if (brand === 'discover') return <div className={`${baseCls} bg-[#ff6000]`}>DISC</div>
  return (
    <div className="w-12 h-8 rounded-md bg-white/20 flex items-center justify-center text-white/60">
      <svg width="22" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
    </div>
  )
}

const Icon = {
  Lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Truck: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  Card: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12" /></svg>,
  Tag: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, fetch } = useCartStore()
  const [products, setProducts] = useState({})
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(0)
  const [appliedCode, setAppliedCode] = useState(null)
  const [couponMsg, setCouponMsg] = useState(null)
  const [touched, setTouched] = useState({})

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    address: '', city: '', zip: '', country: 'United States',
    card_name: '', card_number: '', card_expiry: '', card_cvc: '',
  })

  useEffect(() => { fetch() }, [])
  useEffect(() => {
    if (items.length === 0) return
    Promise.all(items.map((i) => api.get(`/api/products/${i.product_id}`).then((r) => r.data))).then((arr) => {
      const m = {}; arr.forEach((p) => (m[p.id] = p)); setProducts(m)
    })
  }, [items])

  const subtotal = items.reduce((s, i) => s + (products[i.product_id]?.price || 0) * i.quantity, 0)
  const tax = Math.round(Math.max(0, subtotal - discount) * 0.0)  // placeholder if you want to add tax later
  const total = Math.max(0, subtotal - discount) + tax

  const brand = useMemo(() => detectBrand(form.card_number), [form.card_number])
  const cvcLen = brand === 'amex' ? 4 : 3

  const cardDigits = form.card_number.replace(/\D/g, '')
  const cardOk = cardDigits.length >= 13 && luhnValid(form.card_number)
  const expiryOk = /^\d{2}\/\d{2}$/.test(form.card_expiry) && (() => {
    const [mm, yy] = form.card_expiry.split('/').map(Number)
    if (mm < 1 || mm > 12) return false
    const now = new Date()
    const exp = new Date(2000 + yy, mm)
    return exp > now
  })()
  const cvcOk = form.card_cvc.length === cvcLen
  const formValid = form.full_name && form.address && form.city && form.zip && form.card_name && cardOk && expiryOk && cvcOk

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }))
  const errCls = (k, ok) => (touched[k] && !ok ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : '')

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    try {
      const { data } = await api.post('/api/coupons/apply', { code: coupon.trim().toUpperCase(), subtotal })
      if (data.valid) {
        setDiscount(data.discount); setAppliedCode(coupon.trim().toUpperCase())
        setCouponMsg({ ok: true, text: data.message })
        toast.success(data.message)
      } else {
        setDiscount(0); setAppliedCode(null)
        setCouponMsg({ ok: false, text: data.message || 'Invalid' })
      }
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const useTestCard = () => setForm((f) => ({
    ...f,
    card_name: f.card_name || f.full_name || 'Test Customer',
    card_number: '4242 4242 4242 4242',
    card_expiry: '12/30',
    card_cvc: '123',
  }))

  const pay = async (e) => {
    e.preventDefault()
    setTouched({ full_name: true, address: true, city: true, zip: true, card_name: true, card_number: true, card_expiry: true, card_cvc: true })
    if (!formValid) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setLoading(true)
    const fullAddress = `${form.full_name}\n${form.address}\n${form.city}, ${form.zip}\n${form.country}${form.phone ? `\nTel: ${form.phone}` : ''}`
    try {
      const { data } = await api.post('/api/checkout/pay', {
        address: fullAddress,
        card_name: form.card_name,
        card_number: form.card_number,
        card_expiry: form.card_expiry,
        card_cvc: form.card_cvc,
        coupon_code: appliedCode || undefined,
      })
      await fetch()
      navigate(`/checkout/success?ref=${data.payment_ref}&total=${data.total_amount}&orders=${data.order_ids.length}`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex w-16 h-16 rounded-full bg-slate-100 items-center justify-center text-slate-400 mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
        </div>
        <p className="text-slate-500">Your cart is empty.</p>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Secure checkout</h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <Icon.Lock width="12" height="12" /> 256-bit SSL · Demo mode
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={pay} className="lg:col-span-3 space-y-5">

          {/* 1. Contact + delivery */}
          <section className="card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">1</span>
              <Icon.Truck width="18" height="18" className="text-slate-400" />
              Delivery address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label">Full name</label>
                <input className={`input ${errCls('full_name', !!form.full_name)}`} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} onBlur={() => blur('full_name')} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Street address</label>
                <input className={`input ${errCls('address', !!form.address)}`} value={form.address} onChange={(e) => set('address', e.target.value)} onBlur={() => blur('address')} placeholder="123 Main Street, Apt 4B" required />
              </div>
              <div>
                <label className="label">City</label>
                <input className={`input ${errCls('city', !!form.city)}`} value={form.city} onChange={(e) => set('city', e.target.value)} onBlur={() => blur('city')} placeholder="New York" required />
              </div>
              <div>
                <label className="label">ZIP / Postal code</label>
                <input className={`input ${errCls('zip', !!form.zip)}`} value={form.zip} onChange={(e) => set('zip', e.target.value)} onBlur={() => blur('zip')} placeholder="10001" required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Country</label>
                <select className="input" value={form.country} onChange={(e) => set('country', e.target.value)}>
                  <option>United States</option><option>Canada</option><option>United Kingdom</option><option>Pakistan</option><option>India</option><option>Australia</option><option>Germany</option><option>France</option>
                </select>
              </div>
            </div>
          </section>

          {/* 2. Payment */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                <Icon.Card width="18" height="18" className="text-slate-400" />
                Payment
              </h2>
              <button type="button" onClick={useTestCard} className="text-xs text-brand-600 hover:underline font-medium">
                Use test card
              </button>
            </div>

            {/* Animated card preview */}
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 text-white p-5 mb-5 shadow-lg overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-500/20 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-pink-500/10 blur-2xl" />
              <div className="relative">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">Card preview</div>
                    <div className="text-xs text-slate-300 mt-0.5">Shopwave Demo</div>
                  </div>
                  <BrandLogo brand={brand} />
                </div>
                <div className="font-mono text-xl tracking-[0.2em] mb-5 text-slate-100">
                  {form.card_number || '•••• •••• •••• ••••'}
                </div>
                <div className="flex justify-between text-xs">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400">Cardholder</div>
                    <div className="font-medium text-slate-100 uppercase mt-0.5">{form.card_name || 'YOUR NAME'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400">Expires</div>
                    <div className="font-medium text-slate-100 font-mono mt-0.5">{form.card_expiry || 'MM/YY'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label">Cardholder name</label>
                <input className={`input ${errCls('card_name', !!form.card_name)}`} value={form.card_name} onChange={(e) => set('card_name', e.target.value)} onBlur={() => blur('card_name')} placeholder="As it appears on the card" required />
              </div>
              <div className="md:col-span-2">
                <label className="label flex items-center justify-between">
                  <span>Card number</span>
                  {form.card_number && (
                    <span className={`text-[11px] ${cardOk ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {cardOk ? <span className="inline-flex items-center gap-1"><Icon.Check width="12" height="12" /> Valid</span> : `${cardDigits.length} digits`}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    className={`input font-mono pr-12 ${errCls('card_number', cardOk || !form.card_number)}`}
                    value={form.card_number}
                    onChange={(e) => set('card_number', formatCardNumber(e.target.value))}
                    onBlur={() => blur('card_number')}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2"><BrandLogo brand={brand} /></div>
                </div>
                {touched.card_number && form.card_number && !cardOk && (
                  <p className="text-xs text-red-600 mt-1">Card number doesn't look right.</p>
                )}
              </div>
              <div>
                <label className="label">Expiry</label>
                <input
                  className={`input font-mono ${errCls('card_expiry', expiryOk || !form.card_expiry)}`}
                  value={form.card_expiry}
                  onChange={(e) => set('card_expiry', formatExpiry(e.target.value))}
                  onBlur={() => blur('card_expiry')}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  required
                />
                {touched.card_expiry && form.card_expiry && !expiryOk && (
                  <p className="text-xs text-red-600 mt-1">Use MM/YY in the future.</p>
                )}
              </div>
              <div>
                <label className="label">CVC <span className="text-slate-400 font-normal">({cvcLen} digits)</span></label>
                <input
                  className={`input font-mono ${errCls('card_cvc', cvcOk || !form.card_cvc)}`}
                  value={form.card_cvc}
                  onChange={(e) => set('card_cvc', e.target.value.replace(/\D/g, '').slice(0, cvcLen))}
                  onBlur={() => blur('card_cvc')}
                  placeholder={cvcLen === 4 ? '1234' : '123'}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <Icon.Lock width="14" height="14" className="text-slate-400 mt-0.5 shrink-0" />
              <span>
                This is a <strong className="text-slate-700">demo payment</strong> — no real card is charged.
                Use <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-slate-700">4242 4242 4242 4242</span> with any future expiry to simulate a successful purchase.
              </span>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading || !formValid}
            className="btn-gradient w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                Processing payment…
              </>
            ) : (
              <><Icon.Lock width="16" height="16" /> Pay {formatPrice(total)} securely</>
            )}
          </button>
          {!formValid && Object.keys(touched).length > 0 && (
            <p className="text-xs text-center text-slate-500">Complete the highlighted fields to continue.</p>
          )}
        </form>

        {/* Order summary */}
        <aside className="lg:col-span-2 space-y-4">
          <div className="card p-6 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">Order summary</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 -mr-1">
              {items.map((i) => {
                const p = products[i.product_id]
                return (
                  <div key={i.id} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p?.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-300 text-xs">N/A</span>}
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                        {i.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p?.name || `Product #${i.product_id}`}</div>
                      <div className="text-xs text-slate-500">{p && formatPrice(p.price)} each</div>
                    </div>
                    <div className="text-sm font-semibold">{p && formatPrice(p.price * i.quantity)}</div>
                  </div>
                )
              })}
            </div>

            <div className="border-t mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Shipping</span><span className="text-emerald-600 font-medium">Free</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="inline-flex items-center gap-1"><Icon.Tag width="12" height="12" /> {appliedCode}</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-3 border-t mt-2">
                <span>Total</span><span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Promo code</label>
              {appliedCode ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
                    <Icon.Check width="14" height="14" /> {appliedCode}
                  </span>
                  <button type="button" onClick={() => { setDiscount(0); setAppliedCode(null); setCoupon(''); setCouponMsg(null) }} className="text-red-600 text-xs hover:underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="input flex-1 uppercase tracking-wide"
                    placeholder="SAVE10"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button type="button" className="btn-secondary" onClick={applyCoupon}>Apply</button>
                </div>
              )}
              {couponMsg && !appliedCode && (
                <p className={`text-xs mt-1 ${couponMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{couponMsg.text}</p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2"><Icon.Truck width="14" height="14" className="text-slate-400" /> Free shipping, arrives in 3-5 business days</div>
              <div className="flex items-center gap-2"><Icon.Check width="14" height="14" className="text-slate-400" /> 30-day free returns</div>
              <div className="flex items-center gap-2"><Icon.Lock width="14" height="14" className="text-slate-400" /> Encrypted checkout — your details are safe</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
