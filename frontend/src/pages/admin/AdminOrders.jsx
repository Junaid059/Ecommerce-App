import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatPrice, errorMessage } from '../../lib/format'

const STAGES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const load = () => api.get('/api/orders').then((r) => setOrders(r.data))
  useEffect(() => { load() }, [])

  const updateStatus = async (orderId, status, tracking_number) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status, tracking_number: tracking_number || null })
      toast.success('Order updated')
      load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const promptTracking = (o) => {
    const t = prompt('Tracking number:', o.tracking_number || '')
    if (t === null) return
    updateStatus(o.order_id, o.status || 'processing', t)
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold mb-3">All orders ({orders.length})</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500 border-b">
          <th className="py-2">#</th><th>User</th><th>Product</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th>
        </tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.order_id} className="border-b last:border-0">
              <td className="py-2">{o.order_id}</td>
              <td>{o.user_id}</td>
              <td>{o.product_id}</td>
              <td>{o.quantity}</td>
              <td>{formatPrice(o.total_amount || 0)}</td>
              <td>
                <span className={`badge ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {o.payment_status}
                </span>
              </td>
              <td>
                <select
                  className="input py-1 text-xs"
                  value={o.status || 'pending'}
                  onChange={(e) => updateStatus(o.order_id, e.target.value, o.tracking_number)}
                >
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <button onClick={() => promptTracking(o)} className="text-xs text-brand-600 hover:underline">
                  {o.tracking_number || '+ add'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
