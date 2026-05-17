import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { errorMessage } from '../../lib/format'

const empty = {
  code: '',
  discount_type: 'percent',
  discount_value: 10,
  min_order_amount: 0,
  max_uses: '',
  expires_at: '',
  is_active: true,
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)

  const load = () => api.get('/api/coupons').then((r) => setCoupons(r.data))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount || 0),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    try {
      if (editingId) {
        await api.put(`/api/coupons/${editingId}`, payload)
        toast.success('Coupon updated')
      } else {
        await api.post('/api/coupons', payload)
        toast.success('Coupon created')
      }
      setForm(empty); setEditingId(null); load()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const edit = (c) => {
    setEditingId(c.id)
    setForm({
      ...c,
      max_uses: c.max_uses ?? '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    })
  }

  const remove = async (id) => {
    if (!confirm('Delete this coupon?')) return
    try { await api.delete(`/api/coupons/${id}`); toast.success('Deleted'); load() }
    catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <h2 className="md:col-span-2 font-semibold">{editingId ? 'Edit coupon' : 'New coupon'}</h2>
        <input className="input uppercase" placeholder="CODE (e.g. SAVE10)" value={form.code} onChange={(e) => set('code', e.target.value)} required />
        <select className="input" value={form.discount_type} onChange={(e) => set('discount_type', e.target.value)}>
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed $ off</option>
        </select>
        <input className="input" type="number" placeholder={form.discount_type === 'percent' ? '% off' : '$ off'} value={form.discount_value} onChange={(e) => set('discount_value', e.target.value)} required />
        <input className="input" type="number" placeholder="Min order amount ($)" value={form.min_order_amount} onChange={(e) => set('min_order_amount', e.target.value)} />
        <input className="input" type="number" placeholder="Max uses (blank = unlimited)" value={form.max_uses} onChange={(e) => set('max_uses', e.target.value)} />
        <input className="input" type="datetime-local" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <span>Active</span>
        </label>
        <div className="md:col-span-2 flex gap-2">
          <button className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(empty) }}>Cancel</button>}
        </div>
      </form>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">All coupons ({coupons.length})</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2">Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Active</th><th></th>
          </tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2 font-mono">{c.code}</td>
                <td>{c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                <td>${c.min_order_amount}</td>
                <td>{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td>{c.is_active ? '✓' : '—'}</td>
                <td className="text-right">
                  <button className="text-brand-600 mr-3" onClick={() => edit(c)}>Edit</button>
                  <button className="text-red-600" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
