import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      isLoggedIn: false,

      setCurrentUser: (user) => set({ currentUser: user }),
      setAvatar: (updates) =>
        set((state) => ({ currentUser: { ...state.currentUser, ...updates } })),
      setToken: (token) => set({ token }),
      setIsLoggedIn: (status) => set({ isLoggedIn: status }),

      logout: () => {
        set({ currentUser: null, token: null, isLoggedIn: false });
        localStorage.removeItem("user-storage");
      },
    }),
    { name: "user-storage" }
  )
);
