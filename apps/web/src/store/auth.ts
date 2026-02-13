import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api';

interface AuthState {
  user: { id: string; email: string; name: string | null } | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login({ email, password });
      set({
        user: { id: res.id, email: res.email, name: res.name },
        token: res.accessToken,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: getErrorMessage(err) });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register({ name, email, password });
      set({
        user: { id: res.id, email: res.email, name: res.name },
        token: res.accessToken,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: getErrorMessage(err) });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, token: null });
  },

  loadFromStorage: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        set({ token });
      }
    }
  },

  fetchProfile: async () => {
    try {
      const user = await api.getProfile();
      set({ user });
    } catch {
      localStorage.removeItem('accessToken');
      set({ user: null, token: null });
    }
  },
}));
