import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
import FeaturedCarousel from '../components/FeaturedCarousel'
import ProductRow from '../components/ProductRow'
import { getRecentlyViewed } from '../lib/recentlyViewed'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState([])

  useEffect(() => { api.get('/api/categories').then((r) => setCategories(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    setLoading(true)
    const params = activeCat ? { category: activeCat } : {}
    api.get('/api/products', { params })
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false))
  }, [activeCat])

  useEffect(() => {
    const ids = getRecentlyViewed()
    if (ids.length === 0) return
    Promise.all(ids.slice(0, 8).map((id) => api.get(`/api/products/${id}`).then((r) => r.data).catch(() => null)))
      .then((arr) => setRecent(arr.filter(Boolean)))
  }, [])

  return (
    <div className="animate-fade-in">
      <FeaturedCarousel />

      <ProductRow
        title="Recommended for you"
        subtitle="AI-powered picks tuned to your activity"
        url="/api/ai/recommendations"
        params={{ limit: 8 }}
      />

      {recent.length > 0 && (
        <ProductRow title="Recently viewed" subtitle="Pick up where you left off" products={recent} />
      )}

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Shop by category</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCat(null)}
            className={`chip ${activeCat === null ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300 hover:border-brand-300'}`}
          >All products</button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`chip ${activeCat === c.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300 hover:border-brand-300'}`}
            >{c.name}</button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card aspect-[3/4] skeleton" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="text-6xl mb-3">📦</div>
          <p className="text-slate-500">No products yet — sign in as an admin to add some.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
