import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice } from '../lib/format'

export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const total = Number(params.get('total') || 0)
  const orders = Number(params.get('orders') || 0)

  return (
    <div className="max-w-lg mx-auto card p-10 text-center mt-10 animate-slide-up">
      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-4xl mb-4">
        ✓
      </div>
      <h1 className="text-3xl font-bold">Payment successful!</h1>
      <p className="text-slate-500 mt-2">Thanks for your order — we're getting it ready.</p>

      <div className="bg-slate-50 rounded-xl p-5 mt-6 text-left space-y-2 text-sm">
        {ref && (
          <div className="flex justify-between">
            <span className="text-slate-500">Reference</span>
            <span className="font-mono font-medium">{ref}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Orders created</span>
          <span className="font-medium">{orders}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-slate-500">Total charged</span>
          <span className="font-bold text-brand-700">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-center">
        <Link to="/orders" className="btn-primary">View my orders</Link>
        <Link to="/" className="btn-secondary">Keep shopping</Link>
      </div>
    </div>
  )
}
