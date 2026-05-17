import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatPrice, errorMessage } from '../../lib/format'

const empty = { name: '', description: '', price: 0, image_url: '', category: '', stock: 0, is_featured: false }

const LOW_STOCK = 5
const OUT_OF_STOCK = 0

function stockBadge(stock) {
  if (stock <= OUT_OF_STOCK) return { label: 'Out of stock', cls: 'bg-red-100 text-red-700 border-red-200' }
  if (stock <= LOW_STOCK) return { label: `Low · ${stock}`, cls: 'bg-amber-100 text-amber-800 border-amber-200' }
  if (stock <= 20) return { label: `${stock} in stock`, cls: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { label: `${stock} in stock`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | low | out | featured
  const [sort, setSort] = useState('newest')
  const [stockEdits, setStockEdits] = useState({}) // {productId: number}

  const load = () => api.get('/api/products').then((r) => setProducts(r.data))
  useEffect(() => {
    load()
    api.get('/api/categories').then((r) => setCategories(r.data))
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (Number(form.stock) < 0) return toast.error('Stock cannot be negative')
    if (Number(form.price) <= 0) return toast.error('Price must be greater than zero')
    setSubmitting(true)
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category ? Number(form.category) : null,
      is_featured: !!form.is_featured,
    }
    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, payload)
        toast.success('Product updated')
      } else {
        await api.post('/api/products', payload)
        toast.success('Product created')
      }
      setForm(empty); setEditingId(null); load()
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setSubmitting(false) }
  }

  const edit = (p) => {
    setEditingId(p.id)
    setForm({ ...p, category: p.category ?? '', is_featured: !!p.is_featured })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    try { await api.delete(`/api/products/${id}`); toast.success('Product deleted'); load() }
    catch (e) { toast.error(errorMessage(e)) }
  }

  const toggleFeatured = async (p) => {
    try {
      await api.put(`/api/products/${p.id}`, { ...p, is_featured: !p.is_featured })
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const adjustStock = async (p, delta) => {
    const next = Math.max(0, (p.stock ?? 0) + delta)
    try {
      await api.put(`/api/products/${p.id}`, { ...p, stock: next })
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const saveStockEdit = async (p) => {
    const v = Number(stockEdits[p.id])
    if (Number.isNaN(v) || v < 0) return toast.error('Enter a non-negative number')
    try {
      await api.put(`/api/products/${p.id}`, { ...p, stock: v })
      toast.success(`Stock set to ${v}`)
      setStockEdits((s) => { const c = { ...s }; delete c[p.id]; return c })
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('image', file)
    try {
      const { data } = await api.post('/api/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set('image_url', data.image_url)
      toast.success('Image uploaded')
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const generateDescription = async () => {
    if (!form.name.trim()) return toast.error('Enter a product name first')
    setAiLoading(true)
    try {
      const catName = categories.find((c) => c.id === Number(form.category))?.name
      const { data } = await api.post('/api/ai/generate-description', {
        name: form.name,
        category: catName,
        keywords: form.description || undefined,
      })
      set('description', data.description)
      toast.success('Description generated')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setAiLoading(false) }
  }

  const exportCsv = () => {
    const header = ['id', 'name', 'price', 'stock', 'category', 'featured']
    const rows = products.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.price,
      p.stock,
      categories.find((c) => c.id === p.category)?.name || '',
      p.is_featured ? 'yes' : 'no',
    ])
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => {
    let list = products.slice()
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || String(p.id) === q)
    }
    if (filter === 'low') list = list.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK)
    if (filter === 'out') list = list.filter((p) => p.stock <= 0)
    if (filter === 'featured') list = list.filter((p) => p.is_featured)
    if (sort === 'newest') list.sort((a, b) => b.id - a.id)
    if (sort === 'stock-asc') list.sort((a, b) => a.stock - b.stock)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, search, filter, sort])

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + (p.stock || 0), 0)
    const inventoryValue = products.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0)
    const lowCount = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length
    const outCount = products.filter((p) => p.stock <= 0).length
    return { totalUnits, inventoryValue, lowCount, outCount }
  }, [products])

  const lowStockList = useMemo(
    () => products.filter((p) => p.stock <= LOW_STOCK).sort((a, b) => a.stock - b.stock).slice(0, 5),
    [products]
  )

  return (
    <div className="space-y-6">
      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Products" value={products.length} accent="bg-brand-100 text-brand-700" />
        <StatCard label="Units in stock" value={stats.totalUnits.toLocaleString()} accent="bg-blue-100 text-blue-700" />
        <StatCard label="Low stock" value={stats.lowCount} accent="bg-amber-100 text-amber-700" warn={stats.lowCount > 0} />
        <StatCard label="Out of stock" value={stats.outCount} accent="bg-red-100 text-red-700" warn={stats.outCount > 0} />
      </div>

      {(stats.outCount > 0 || stats.lowCount > 0) && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-900">Inventory alert</h3>
              <p className="text-sm text-amber-800/80 mt-0.5">
                {stats.outCount > 0 && <>{stats.outCount} product{stats.outCount === 1 ? '' : 's'} out of stock · </>}
                {stats.lowCount > 0 && <>{stats.lowCount} running low (≤{LOW_STOCK} units)</>}
              </p>
              {lowStockList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lowStockList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => edit(p)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
                    >
                      {p.name} · {p.stock}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center justify-between">
          <h2 className="font-semibold text-lg">{editingId ? `Editing product #${editingId}` : 'New product'}</h2>
          <span className="text-xs text-slate-400">All fields are saved instantly on submit</span>
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input" placeholder="Wireless headphones" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Price (USD)</label>
          <input className="input" type="number" min="1" step="1" placeholder="49" value={form.price} onChange={(e) => set('price', e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Description</label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={aiLoading}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.9 5.8L20 9.6l-4.7 3.6L17 19l-5-3.3L7 19l1.7-5.8L4 9.6l6.1-1.8z"/></svg>
              {aiLoading ? 'Writing…' : 'Generate with AI'}
            </button>
          </div>
          <textarea className="input w-full" placeholder="Describe the product, or jot keywords and click Generate." rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="md:col-span-2 flex gap-2 items-start">
          <div className="flex-1">
            <label className="label">Image URL</label>
            <input className="input" placeholder="https://… or upload →" value={form.image_url || ''} onChange={(e) => set('image_url', e.target.value)} />
          </div>
          <div>
            <label className="label">Upload</label>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              File
              <input type="file" hidden accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
            </label>
          </div>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category || ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Stock (units available)</label>
          <div className="flex items-stretch gap-1">
            <button type="button" onClick={() => set('stock', Math.max(0, Number(form.stock) - 1))} className="px-3 bg-slate-100 hover:bg-slate-200 rounded-l-lg text-lg">−</button>
            <input className="input rounded-none text-center" type="number" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} required />
            <button type="button" onClick={() => set('stock', Number(form.stock) + 1)} className="px-3 bg-slate-100 hover:bg-slate-200 rounded-r-lg text-lg">+</button>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[10, 25, 50, 100].map((n) => (
              <button key={n} type="button" onClick={() => set('stock', n)} className="text-xs px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600">
                +{n}
              </button>
            ))}
          </div>
          {Number(form.stock) > 0 && Number(form.stock) <= LOW_STOCK && (
            <p className="text-xs text-amber-700 mt-1">Low stock — customers will see a "only N left" warning.</p>
          )}
          {Number(form.stock) === 0 && (
            <p className="text-xs text-red-600 mt-1">This product will be marked as out of stock and can't be purchased.</p>
          )}
        </div>
        <label className="md:col-span-2 flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="w-4 h-4 accent-brand-600" />
          <span className="text-sm">Feature this product on the homepage</span>
        </label>
        <div className="md:col-span-2 flex gap-2 pt-2 border-t">
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}</button>
          {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(empty) }}>Cancel</button>}
        </div>
      </form>

      {/* Product table with toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">All products <span className="text-slate-400 font-normal">({filtered.length} of {products.length})</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="input pl-8 py-1.5 text-sm w-44" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All products</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="featured">Featured</option>
            </select>
            <select className="input py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="stock-asc">Stock (low to high)</option>
              <option value="price-desc">Price (high to low)</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <button onClick={exportCsv} className="btn-secondary py-1.5 text-sm inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-2 w-12">#</th>
                <th>Product</th>
                <th className="text-right">Price</th>
                <th className="w-64">Stock</th>
                <th>Status</th>
                <th className="w-10"></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const b = stockBadge(p.stock)
                const editing = stockEdits[p.id] !== undefined
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="py-2 text-slate-400">{p.id}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">N/A</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[200px]">{p.name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[200px]">
                            {categories.find((c) => c.id === p.category)?.name || 'Uncategorised'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-medium">{formatPrice(p.price)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => adjustStock(p, -1)} disabled={p.stock <= 0} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-sm" title="−1">−</button>
                        {editing ? (
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={stockEdits[p.id]}
                            onChange={(e) => setStockEdits((s) => ({ ...s, [p.id]: e.target.value }))}
                            onBlur={() => saveStockEdit(p)}
                            onKeyDown={(e) => e.key === 'Enter' && saveStockEdit(p)}
                            className="w-16 text-center text-sm border border-brand-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
                          />
                        ) : (
                          <button onClick={() => setStockEdits((s) => ({ ...s, [p.id]: p.stock }))} className="w-16 text-center text-sm font-semibold hover:bg-slate-100 rounded py-0.5" title="Click to edit">
                            {p.stock}
                          </button>
                        )}
                        <button onClick={() => adjustStock(p, 1)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-sm" title="+1">+</button>
                        <button onClick={() => adjustStock(p, 10)} className="text-xs px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border text-slate-600" title="+10">+10</button>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${b.cls}`}>{b.label}</span>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(p)} title={p.is_featured ? 'Unfeature' : 'Feature'} className={p.is_featured ? 'text-amber-500 text-lg' : 'text-slate-300 hover:text-amber-400 text-lg'}>★</button>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button className="text-brand-600 hover:underline mr-3 text-sm" onClick={() => edit(p)}>Edit</button>
                      <button className="text-red-600 hover:underline text-sm" onClick={() => remove(p.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No products match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Tip: click the stock number to type a new value, or use the − / + buttons for quick adjustments.
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, warn }) {
  return (
    <div className={`card p-4 ${warn ? 'ring-1 ring-amber-200' : ''}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${warn ? 'text-amber-700' : 'text-slate-800'}`}>{value}</div>
      <div className={`mt-2 inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${accent}`}>inventory</div>
    </div>
  )
}
