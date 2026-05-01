import { create } from 'zustand';
import api from '@/services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('app_user') || 'null'),
  token: localStorage.getItem('app_token') || null,
  loading: false,

  login: async (credentials) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('app_token', data.token);
      localStorage.setItem('app_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.message || 'Login failed' };
    }
  },

  register: async (form) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('app_token', data.token);
      localStorage.setItem('app_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.message || 'Register failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_user');
    set({ user: null, token: null });
  },

  hydrate: async () => {
    if (!get().token) return;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user });
      localStorage.setItem('app_user', JSON.stringify(data.user));
    } catch {
      get().logout();
    }
  },
}));
