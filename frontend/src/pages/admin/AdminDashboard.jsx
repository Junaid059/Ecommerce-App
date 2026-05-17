import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatPrice, errorMessage } from '../../lib/format'

const Icon = {
  Cube: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Cart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>,
  Dollar: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  Users: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Alert: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
}

const CAT_COLORS = [
  'from-brand-500 to-brand-700',
  'from-emerald-500 to-emerald-700',
  'from-indigo-500 to-indigo-700',
  'from-pink-500 to-pink-700',
  'from-amber-500 to-amber-700',
  'from-cyan-500 to-cyan-700',
  'from-violet-500 to-violet-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
]

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  const load = async (days = range) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/admin/analytics?days=${days}`)
      setData(data)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(range) }, [range])

  if (loading && !data) return <div className="text-slate-500">Loading analytics…</div>
  if (!data) return null

  const maxCat = Math.max(1, ...data.revenue_by_category.map((c) => c.revenue))
  const maxDay = Math.max(1, ...data.daily_revenue.map((d) => d.revenue))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time performance, inventory health and revenue analytics.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${range === d ? 'bg-white shadow text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Last {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total revenue" value={formatPrice(data.total_revenue)} sub={`${data.paid_orders} paid order${data.paid_orders === 1 ? '' : 's'}`} icon={<Icon.Dollar width="18" height="18" />} accent="from-emerald-500 to-emerald-700" />
        <Kpi label="Last 30 days" value={formatPrice(data.last_30d_revenue)} sub={`AOV ${formatPrice(data.avg_order_value)}`} icon={<Icon.Cart width="18" height="18" />} accent="from-brand-500 to-brand-700" />
        <Kpi label="Inventory value" value={formatPrice(data.stock_health.inventory_value)} sub={`${data.stock_health.total_skus} SKU${data.stock_health.total_skus === 1 ? '' : 's'} · ${data.stock_health.total_units} units`} icon={<Icon.Cube width="18" height="18" />} accent="from-indigo-500 to-indigo-700" />
        <Kpi label="Customers" value={data.unique_customers} sub={`${data.pending_orders} pending order${data.pending_orders === 1 ? '' : 's'}`} icon={<Icon.Users width="18" height="18" />} accent="from-pink-500 to-pink-700" />
      </div>

      {/* Daily revenue chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Revenue trend</h3>
            <p className="text-xs text-slate-500">Daily revenue, last {range} days</p>
          </div>
          <div className="text-xs text-slate-500">
            Peak: <span className="font-semibold text-slate-700">{formatPrice(maxDay)}</span>
          </div>
        </div>
        <DailyRevenueChart points={data.daily_revenue} />
      </div>

      {/* Revenue by category + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-3">
          <h3 className="font-semibold mb-1">Revenue by category</h3>
          <p className="text-xs text-slate-500 mb-4">All-time, paid orders only</p>
          {data.revenue_by_category.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No paid orders yet — share your store to start tracking revenue.</p>
          ) : (
            <div className="space-y-3">
              {data.revenue_by_category.map((c, i) => (
                <div key={c.category_id ?? `uncat-${i}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.category_name}</span>
                    <span className="tabular-nums text-slate-600">{formatPrice(c.revenue)} <span className="text-slate-400 text-xs">· {c.units_sold} units</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${CAT_COLORS[i % CAT_COLORS.length]} rounded-full transition-all`}
                      style={{ width: `${(c.revenue / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1">Top products</h3>
          <p className="text-xs text-slate-500 mb-4">Best sellers by revenue</p>
          {data.top_products.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No sales yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {data.top_products.map((p, i) => (
                <li key={p.product_id} className="flex items-center gap-3 group">
                  <span className="w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-brand-700">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.units_sold} sold · stock {p.stock}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatPrice(p.revenue)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Stock health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Icon.Alert width="16" height="16" className="text-amber-500" /> Stock health</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StockStat color="emerald" label="Healthy" value={data.stock_health.healthy_stock} />
            <StockStat color="amber" label="Low (≤5)" value={data.stock_health.low_stock} />
            <StockStat color="red" label="Out of stock" value={data.stock_health.out_of_stock} />
          </div>
          <Link to="/admin/products" className="text-sm text-brand-600 hover:underline">Review products →</Link>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Orders by status</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(data.status_breakdown).length === 0 ? (
              <p className="text-slate-400 text-sm">No orders yet.</p>
            ) : Object.entries(data.status_breakdown).map(([s, n]) => (
              <div key={s} className="flex justify-between items-center">
                <span className="capitalize text-slate-600">{s}</span>
                <span className="font-semibold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSV importer */}
      <CsvImporter onImported={() => load(range)} />
    </div>
  )
}

function Kpi({ label, value, sub, icon, accent }) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function StockStat({ color, label, value }) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`border rounded-lg p-3 ${map[color]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}

function DailyRevenueChart({ points }) {
  // SVG line + area chart with hover tooltips. Width auto-scales to container.
  const w = 800
  const h = 200
  const pad = { l: 8, r: 8, t: 14, b: 18 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const max = Math.max(1, ...points.map((p) => p.revenue))
  const n = points.length
  const xs = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const ys = (v) => pad.t + innerH - (v / max) * innerH

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(p.revenue).toFixed(1)}`).join(' ')
  const area = `${path} L ${xs(n - 1).toFixed(1)} ${pad.t + innerH} L ${xs(0).toFixed(1)} ${pad.t + innerH} Z`

  const [hover, setHover] = useState(null)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * t} y2={pad.t + innerH * t} stroke="#e2e8f0" strokeDasharray="2 4" />
        ))}
        <path d={area} fill="url(#rev-grad)" />
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover({ ...p, i })} onMouseLeave={() => setHover(null)}>
            <circle cx={xs(i)} cy={ys(p.revenue)} r={hover?.i === i ? 4 : 2.5} fill="#7c3aed" />
            <rect x={xs(i) - 12} y={pad.t} width={24} height={innerH} fill="transparent" />
          </g>
        ))}
      </svg>
      {hover && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: `${(xs(hover.i) / w) * 100}%`, top: `${(ys(hover.revenue) / h) * 100}%` }}
        >
          <div className="font-semibold">{formatPrice(hover.revenue)}</div>
          <div className="text-[10px] opacity-70">{hover.date} · {hover.orders} order{hover.orders === 1 ? '' : 's'}</div>
        </div>
      )}
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function CsvImporter({ onImported }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  const onPick = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv') && !f.name.toLowerCase().endsWith('.txt')) {
      toast.error('Please choose a .csv file')
      return
    }
    setFile(f)
    setResult(null)
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/api/admin/import-csv?update_existing=true', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      toast.success(`Imported ${data.products_created} new, updated ${data.products_updated}`)
      onImported?.()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const r = await api.get('/api/admin/import-csv/template', { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'products-template.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Icon.Upload width="16" height="16" /> Bulk import products</h3>
          <p className="text-xs text-slate-500 mt-1">Upload a CSV to create or update hundreds of products at once. Categories are created automatically.</p>
        </div>
        <button onClick={downloadTemplate} className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
          <Icon.Download width="12" height="12" /> Download template
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files?.[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Icon.Upload width="28" height="28" className="mx-auto text-slate-400 mb-2" />
        {file ? (
          <div>
            <div className="font-medium text-slate-700">{file.name}</div>
            <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
          </div>
        ) : (
          <div>
            <div className="font-medium text-slate-700">Drop a CSV here, or click to browse</div>
            <div className="text-xs text-slate-500 mt-1">Columns: name, description, price, stock, category, image_url, is_featured</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={upload} disabled={!file || uploading} className="btn-primary disabled:opacity-50">
          {uploading ? 'Uploading…' : 'Import products'}
        </button>
        {file && !uploading && (
          <button onClick={() => { setFile(null); setResult(null) }} className="btn-secondary">Clear</button>
        )}
      </div>

      {result && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          <div className="font-semibold text-emerald-800">Import complete in {result.duration_ms}ms</div>
          <div className="text-emerald-700 mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="font-bold">{result.products_created}</span> created</div>
            <div><span className="font-bold">{result.products_updated}</span> updated</div>
            <div><span className="font-bold">{result.categories_created}</span> new categories</div>
            <div><span className="font-bold">{result.rows_skipped}</span> skipped</div>
          </div>
          {result.errors?.length > 0 && (
            <details className="mt-2 text-xs text-amber-800">
              <summary className="cursor-pointer">{result.errors.length} warning{result.errors.length === 1 ? '' : 's'}</summary>
              <ul className="mt-1 pl-4 list-disc space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
