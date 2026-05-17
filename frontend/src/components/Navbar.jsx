import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import { useEffect } from 'react'

export default function Navbar() {
  const { user, logout, isAuthed, isSeller } = useAuthStore()
  const cart = useCartStore((s) => s.items)
  const fetchCart = useCartStore((s) => s.fetch)
  const clearCart = useCartStore((s) => s.clear)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthed()) fetchCart().catch(() => {})
  }, [user?.id])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600 hover:text-brand-700 hover:bg-slate-100'
    }`

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center shadow-soft">S</span>
          <span className="hidden sm:inline">
            <span className="text-brand-600">Shop</span><span className="text-slate-900">wave</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={linkCls} end>Shop</NavLink>
          <NavLink to="/search" className={linkCls}>Search</NavLink>
          {isAuthed() && <NavLink to="/orders" className={linkCls}>Orders</NavLink>}
          {isAuthed() && <NavLink to="/wishlist" className={linkCls}>Wishlist</NavLink>}
          {isSeller() && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthed() && (
            <Link
              to="/cart"
              className="relative w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Cart"
            >
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {isAuthed() ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-slate-700 max-w-[140px] truncate">{user?.email}</span>
              </div>
              <button
                className="btn-ghost text-sm"
                onClick={() => { logout(); clearCart(); navigate('/login') }}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Login</Link>
              <Link to="/register" className="btn-gradient">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
