import { useEffect, useState } from 'react'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'

export default function Search() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [semantic, setSemantic] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      setLoading(true)
      const req = semantic
        ? api.post('/api/ai/semantic-search', { query: q, limit: 20 })
        : api.get('/api/search/products', { params: { q } })
      req.then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q, semantic])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          className="input flex-1"
          placeholder={semantic ? 'Describe what you want (e.g. "comfy blue shoes for running")' : 'Search products by name…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} />
          <span>🧠 AI semantic search</span>
        </label>
      </div>
      {!q.trim() ? (
        <p className="text-slate-500">Start typing to search the catalog.</p>
      ) : loading ? (
        <p>Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-slate-500">No results.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
