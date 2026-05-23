// ─────────────────────────────────────────────
// UI Store (Zustand)
// Toasts, modals, and global UI state.
// ─────────────────────────────────────────────

import { create } from 'zustand';

interface Toast {
  id:      string;
  message: string;
  type:    'success' | 'error' | 'warning' | 'info';
}

interface UIState {
  toasts:     Toast[];
  showToast:  (message: string, type?: Toast['type']) => void;
  hideToast:  (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  hideToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));