import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'

export default function ProductCard({ p }) {
  const inStock = p.stock > 0
  return (
    <Link
      to={`/product/${p.id}`}
      className="card-hover overflow-hidden flex flex-col group relative"
    >
      {p.is_featured && (
        <span className="absolute top-2 left-2 z-10 badge bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow">
          ⭐ Featured
        </span>
      )}
      {!inStock && (
        <span className="absolute top-2 right-2 z-10 badge-danger">Sold out</span>
      )}
      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-6xl opacity-40">📦</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-brand-700 transition">{p.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">
          {p.description || 'No description'}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-brand-600">{formatPrice(p.price)}</span>
          <span className={inStock ? 'badge-success' : 'badge-danger'}>
            {inStock ? `${p.stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  )
}
