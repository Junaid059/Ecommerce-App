import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { formatPrice, errorMessage } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import { pushRecentlyViewed } from '../lib/recentlyViewed'
import ProductRow from '../components/ProductRow'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [avg, setAvg] = useState({ average: 0, count: 0 })
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [rating, setRating] = useState(5)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const { isAuthed } = useAuthStore()
  const addToCart = useCartStore((s) => s.add)

  const refresh = () => {
    api.get(`/api/products/${id}`).then((r) => setProduct(r.data)).catch(() => {})
    api.get(`/api/ratings/product/${id}/average`).then((r) => setAvg(r.data)).catch(() => {})
    api.get(`/api/comments/product/${id}`).then((r) => setComments(r.data)).catch(() => {})
  }
  useEffect(refresh, [id])
  useEffect(() => { pushRecentlyViewed(id) }, [id])

  const inStock = product && product.stock > 0
  const maxQty = product?.stock || 1

  const onAddToCart = async () => {
    if (!isAuthed()) return toast.error('Please log in first')
    setAdding(true)
    try {
      await addToCart(Number(id), qty)
      toast.success('Added to cart')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally { setAdding(false) }
  }

  const onAddToWishlist = async () => {
    if (!isAuthed()) return toast.error('Please log in first')
    try {
      await api.post('/api/wishlist', { product_id: Number(id) })
      toast.success('Added to wishlist')
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const submitRating = async () => {
    try { await api.post('/api/ratings', { product_id: Number(id), rating }); toast.success('Rating saved'); refresh() }
    catch (e) { toast.error(errorMessage(e)) }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try { await api.post('/api/comments', { product_id: Number(id), comment: newComment }); setNewComment(''); refresh() }
    catch (e) { toast.error(errorMessage(e)) }
  }

  if (!product) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-9xl opacity-30">📦</span>
          )}
        </div>
        <div>
          {product.is_featured && (
            <span className="badge bg-gradient-to-r from-amber-400 to-amber-500 text-white mb-2 inline-block">⭐ Featured</span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-slate-500 text-sm">
            <span className="text-yellow-500">{'★'.repeat(Math.round(avg.average))}{'☆'.repeat(5 - Math.round(avg.average))}</span>
            <span>{avg.average.toFixed?.(1) || avg.average} ({avg.count} reviews)</span>
          </div>
          <p className="mt-4 text-slate-700 leading-relaxed">{product.description || 'No description.'}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-brand-600">{formatPrice(product.price)}</span>
            <span className={inStock ? (product.stock < 5 ? 'badge-warning' : 'badge-success') : 'badge-danger'}>
              {inStock ? (product.stock < 5 ? `Only ${product.stock} left!` : `${product.stock} in stock`) : 'Out of stock'}
            </span>
          </div>

          {inStock && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-lg">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 hover:bg-slate-200 rounded-l-lg text-lg">−</button>
                <span className="w-12 text-center font-medium">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="w-10 h-10 hover:bg-slate-200 rounded-r-lg text-lg disabled:opacity-30">+</button>
              </div>
              <button className="btn-gradient flex-1" disabled={adding} onClick={onAddToCart}>
                {adding ? 'Adding…' : '🛒 Add to cart'}
              </button>
              <button className="btn-secondary" onClick={onAddToWishlist} aria-label="Add to wishlist">♡</button>
            </div>
          )}
          {!inStock && (
            <div className="mt-6">
              <button disabled className="btn w-full bg-slate-200 text-slate-500 cursor-not-allowed">
                Out of stock
              </button>
            </div>
          )}

          {isAuthed() && (
            <div className="mt-8 card p-4">
              <h3 className="font-semibold mb-2">Rate this product</h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>★</button>
                ))}
                <button className="btn-primary ml-3" onClick={submitRating}>Submit</button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="font-semibold mb-3">Reviews ({comments.length})</h3>
            {isAuthed() && (
              <form onSubmit={submitComment} className="flex gap-2 mb-4">
                <input className="input flex-1" placeholder="Share your thoughts…" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                <button className="btn-primary">Post</button>
              </form>
            )}
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="card p-3 text-sm">
                    <div className="text-slate-400 text-xs mb-1">👤 User #{c.user_id}</div>
                    {c.comment}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <ProductRow title="Related products" subtitle="Similar items via AI" url={`/api/ai/related/${id}`} params={{ limit: 6 }} />
      </div>
    </div>
  )
}
