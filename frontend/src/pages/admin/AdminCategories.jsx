import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { errorMessage } from '../../lib/format'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')

  const load = () => api.get('/api/categories').then((r) => setCategories(r.data))
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    try { await api.post('/api/categories', { name }); setName(''); load() }
    catch (e) { toast.error(errorMessage(e)) }
  }
  const remove = async (id) => {
    if (!confirm('Delete category?')) return
    try { await api.delete(`/api/categories/${id}`); load() }
    catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card p-4 flex gap-2">
        <input className="input flex-1" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn-primary">Add</button>
      </form>
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Categories</h2>
        <ul className="divide-y">
          {categories.map((c) => (
            <li key={c.id} className="py-2 flex justify-between">
              <span>{c.name}</span>
              <button className="text-red-600 text-sm" onClick={() => remove(c.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
