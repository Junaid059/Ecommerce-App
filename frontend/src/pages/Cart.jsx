import { useEffect, useState } from 'react'
import { useCartStore } from '../store/cart'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { formatPrice, errorMessage } from '../lib/format'
import toast from 'react-hot-toast'

const Icon = {
  Cart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>,
  Trash: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  Truck: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
}

export default function Cart() {
  const navigate = useNavigate()
  const { items, fetch, update, remove } = useCartStore()
  const [products, setProducts] = useState({})

  useEffect(() => { fetch() }, [])

  useEffect(() => {
    if (items.length === 0) return
    Promise.all(items.map((i) => api.get(`/api/products/${i.product_id}`).then((r) => r.data))).then((arr) => {
      const m = {}; arr.forEach((p) => (m[p.id] = p)); setProducts(m)
    })
  }, [items])

  const subtotal = items.reduce((s, i) => s + (products[i.product_id]?.price || 0) * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  const safeUpdate = async (id, qty, max) => {
    if (qty > max) { toast.error(`Only ${max} in stock`); return }
    try { await update(id, qty) } catch (e) { toast.error(errorMessage(e)) }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="inline-flex w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center text-slate-300 mb-5">
          <Icon.Cart width="40" height="40" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-6">Looks like you haven't added anything yet — let's fix that.</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">Browse products <Icon.Arrow width="16" height="16" /></Link>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-3xl font-bold">Your cart</h1>
        <span className="text-sm text-slate-500">{totalItems} item{totalItems === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((i) => {
            const p = products[i.product_id]
            const max = p?.stock ?? 99
            const lineTotal = p ? p.price * i.quantity : 0
            const lowStock = p && p.stock > 0 && p.stock <= 5
            const outOfStock = p && p.stock <= 0
            return (
              <div key={i.id} className="card p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
                <Link to={`/product/${i.product_id}`} className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p?.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="text-slate-300 text-xs">No image</span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${i.product_id}`} className="font-medium hover:text-brand-700 line-clamp-1">{p?.name || `Product #${i.product_id}`}</Link>
                  <div className="text-sm text-slate-500 mt-0.5">{p && formatPrice(p.price)} each</div>
                  {lowStock && (
                    <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1.5">
                      Only {p.stock} left in stock
                    </div>
                  )}
                  {outOfStock && (
                    <div className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mt-1.5">
                      Out of stock
                    </div>
                  )}
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg">
                  <button
                    onClick={() => safeUpdate(i.id, Math.max(1, i.quantity - 1), max)}
                    className="w-8 h-8 hover:bg-slate-200 rounded-l-lg text-lg"
                    aria-label="Decrease"
                  >−</button>
                  <span className="w-10 text-center text-sm font-medium">{i.quantity}</span>
                  <button
                    onClick={() => safeUpdate(i.id, i.quantity + 1, max)}
                    disabled={i.quantity >= max}
                    className="w-8 h-8 hover:bg-slate-200 rounded-r-lg text-lg disabled:opacity-30"
                    aria-label="Increase"
                  >+</button>
                </div>
                <div className="font-bold w-24 text-right tabular-nums">
                  {formatPrice(lineTotal)}
                </div>
                <button className="text-slate-300 hover:text-red-600 transition" onClick={() => remove(i.id)} aria-label="Remove from cart">
                  <Icon.Trash width="16" height="16" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="card p-6 h-fit sticky top-20">
          <h2 className="text-lg font-semibold mb-4">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})</span><span className="tabular-nums">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Shipping</span><span className="text-emerald-600 font-medium">Free</span></div>
            <div className="flex justify-between font-bold text-lg pt-3 border-t mt-2">
              <span>Estimated total</span><span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
          </div>
          <button className="btn-gradient w-full mt-5 inline-flex items-center justify-center gap-2" onClick={() => navigate('/checkout')}>
            Proceed to checkout <Icon.Arrow width="16" height="16" />
          </button>
          <div className="mt-4 pt-4 border-t text-xs text-slate-500 space-y-1.5">
            <div className="flex items-center gap-2"><Icon.Truck width="14" height="14" className="text-slate-400" /> Free shipping, 3-5 business days</div>
            <p>Promo codes can be applied at checkout.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
