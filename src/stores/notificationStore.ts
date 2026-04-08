import { create } from 'zustand';

// ========================================
// TYPES
// ========================================

export type NotificationType = 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
}

export interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ========================================
// STORE
// ========================================

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (n) =>
    set((state) => {
      const id = crypto.randomUUID();
      const timestamp = Date.now();
      const newNotification: Notification = { id, timestamp, ...n };
      const next = [...state.notifications];
      if (next.length >= 5) {
        next.shift();
      }
      next.push(newNotification);
      return { notifications: next };
    }),

  removeNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((x) => x.id !== id) })),

  clearNotifications: () => set({ notifications: [] }),
}));

// Notes: keep state JSON-serializable. Auto-dismiss should be handled by UI.
