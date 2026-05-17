import { create } from 'zustand'
import { api } from '../api/client'

export const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/api/cart')
      set({ items: data })
    } finally {
      set({ loading: false })
    }
  },
  add: async (product_id, quantity = 1) => {
    await api.post('/api/cart', { product_id, quantity })
    await get().fetch()
  },
  update: async (cart_id, quantity) => {
    await api.put(`/api/cart/${cart_id}`, { quantity })
    await get().fetch()
  },
  remove: async (cart_id) => {
    await api.delete(`/api/cart/${cart_id}`)
    await get().fetch()
  },
  clear: () => set({ items: [] }),
}))
