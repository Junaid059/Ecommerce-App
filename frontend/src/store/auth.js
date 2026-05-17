import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),
      setAccessToken: (access) => set({ accessToken: access }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthed: () => !!get().accessToken,
      isAdmin: () => get().user?.role === 'admin',
      isSeller: () => ['admin', 'seller'].includes(get().user?.role),
    }),
    { name: 'auth-storage' }
  )
)
