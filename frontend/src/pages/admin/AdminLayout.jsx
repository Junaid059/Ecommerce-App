import { NavLink, Outlet } from 'react-router-dom'

const Icon = {
  Grid: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  Package: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Folder: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  Receipt: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" /></svg>,
  Tag: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
}

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Icon.Grid },
  { to: '/admin/products', label: 'Products', icon: Icon.Package },
  { to: '/admin/categories', label: 'Categories', icon: Icon.Folder },
  { to: '/admin/orders', label: 'Orders', icon: Icon.Receipt },
  { to: '/admin/coupons', label: 'Coupons', icon: Icon.Tag },
]

export default function AdminLayout() {
  const cls = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
      isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
    }`
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      <aside className="card p-3 h-fit md:sticky md:top-20">
        <h2 className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-2 px-3 mt-1">Admin panel</h2>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={cls}>
              <n.icon width="16" height="16" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t mt-3 pt-3 px-3 text-[11px] text-slate-400">
          Tip: use the dashboard to spot inventory gaps before they cost you sales.
        </div>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  )
}
