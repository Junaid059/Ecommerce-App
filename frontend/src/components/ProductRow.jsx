import { useEffect, useState } from 'react'
import { api } from '../api/client'
import ProductCard from './ProductCard'

/**
 * Horizontal row of products. Loads from an arbitrary endpoint URL.
 * Usage:
 *   <ProductRow title="Recommended for you" url="/api/ai/recommendations" params={{ limit: 8 }} />
 */
export default function ProductRow({ title, subtitle, url, params, products: external }) {
  const [products, setProducts] = useState(external || [])
  const [loading, setLoading] = useState(!external)

  useEffect(() => {
    if (external) { setProducts(external); return }
    if (!url) return
    setLoading(true)
    api.get(url, { params })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [url, JSON.stringify(params), external])

  if (!loading && products.length === 0) return null

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card aspect-square bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  )
}
