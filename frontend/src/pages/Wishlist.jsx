import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatPrice, errorMessage } from '../lib/format'
import { useCartStore } from '../store/cart'

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [products, setProducts] = useState({})
  const addToCart = useCartStore((s) => s.add)

  const load = () => api.get('/api/wishlist').then((r) => setItems(r.data))
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (items.length === 0) return
    Promise.all(items.map((i) => api.get(`/api/products/${i.product_id}`).then((r) => r.data).catch(() => null)))
      .then((arr) => {
        const m = {}; arr.filter(Boolean).forEach((p) => (m[p.id] = p)); setProducts(m)
      })
  }, [items])

  const remove = async (product_id) => {
    try {
      await api.delete(`/api/wishlist/${product_id}`)
      toast.success('Removed from wishlist')
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const moveToCart = async (i) => {
    try {
      await addToCart(i.product_id, 1)
      await api.delete(`/api/wishlist/${i.product_id}`)
      toast.success('Moved to cart')
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-7xl mb-4">💜</div>
        <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
        <p className="text-slate-500 mb-6">Save items you love for later.</p>
        <Link to="/" className="btn-primary">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-3xl font-bold mb-6">Wishlist</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((i) => {
          const p = products[i.product_id]
          return (
            <div key={i.id} className="card p-4 flex items-center gap-4">
              <Link to={`/product/${i.product_id}`} className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {p?.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : '📦'}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${i.product_id}`} className="font-medium hover:text-brand-700 line-clamp-1">
                  {p?.name || `Product #${i.product_id}`}
                </Link>
                <div className="text-sm text-brand-600 font-semibold">{p && formatPrice(p.price)}</div>
              </div>
              <button
                className="btn-secondary text-sm"
                onClick={() => moveToCart(i)}
                disabled={!p || p.stock === 0}
              >
                {p?.stock === 0 ? 'Sold out' : 'Move to cart'}
              </button>
              <button className="text-red-500 hover:text-red-700" onClick={() => remove(i.product_id)} aria-label="Remove">✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
