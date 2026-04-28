import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAdmin: () => {
        const state = useAuthStore.getState()
        return state.user?.role === 'admin'
      },
      isManager: () => {
        const state = useAuthStore.getState()
        return ['admin', 'manager'].includes(state.user?.role)
      },
    }),
    { name: 'filo-auth' }
  )
)
