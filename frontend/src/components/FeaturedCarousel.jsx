import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatPrice } from '../lib/format'

export default function FeaturedCarousel() {
  const [items, setItems] = useState([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    api.get('/api/products', { params: { featured: true, limit: 6 } })
      .then((r) => setItems(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000)
    return () => clearInterval(t)
  }, [items])

  if (items.length === 0) return null
  const p = items[idx]

  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white mb-8 h-72 md:h-80">
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-brand-200 mb-2">✨ Featured</div>
          <h2 className="text-3xl md:text-4xl font-bold line-clamp-2">{p.name}</h2>
          <p className="text-brand-100 mt-2 line-clamp-3 max-w-md">
            {p.description || 'Discover this hand-picked favorite.'}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-2xl font-bold">{formatPrice(p.price)}</span>
            <Link
              to={`/product/${p.id}`}
              className="bg-white text-brand-700 font-medium px-5 py-2 rounded-lg hover:bg-brand-50"
            >
              Shop now →
            </Link>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center p-6">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} className="max-h-full max-w-full object-contain drop-shadow-2xl" />
          ) : (
            <span className="text-9xl">🛍️</span>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition ${i === idx ? 'bg-white w-6' : 'bg-white/50'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
