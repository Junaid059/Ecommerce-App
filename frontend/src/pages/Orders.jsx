import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatPrice } from '../lib/format'

const STAGES = ['pending', 'processing', 'shipped', 'delivered']

function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return <span className="badge bg-red-100 text-red-700">Cancelled</span>
  }
  const currentIdx = STAGES.indexOf(status)
  return (
    <div className="flex items-center gap-1 mt-2">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i <= currentIdx ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-400'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-[11px] ml-1 capitalize ${
              i <= currentIdx ? 'text-brand-700 font-medium' : 'text-slate-400'
            }`}
          >{s}</span>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-brand-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.get('/api/orders').then((r) => setOrders(r.data))
  }, [])

  if (orders.length === 0) return <p className="text-slate-500">No orders yet.</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.order_id} className="card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Order #{o.order_id}</div>
                <div className="text-sm text-slate-500">
                  Product #{o.product_id} · Qty {o.quantity} · {o.address}
                </div>
                {o.tracking_number && (
                  <div className="text-xs text-slate-500 mt-1">📦 Tracking: <span className="font-mono">{o.tracking_number}</span></div>
                )}
                {o.coupon_code && (
                  <div className="text-xs text-green-700 mt-1">🏷️ {o.coupon_code} (−{formatPrice(o.discount_amount || 0)})</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatPrice(o.total_amount || 0)}</div>
                <span
                  className={`badge ${
                    o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {o.payment_status}
                </span>
              </div>
            </div>
            <StatusTimeline status={o.status || 'pending'} />
          </div>
        ))}
      </div>
    </div>
  )
}
