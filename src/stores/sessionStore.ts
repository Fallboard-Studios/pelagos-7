import { create } from 'zustand';

// ========================================
// TYPES
// ========================================

export interface SessionStore {
  sessionId: string | null;
  unsavedChanges: boolean;

  setSession: (id: string | null) => void;
  setUnsavedChanges: (flag: boolean) => void;
}

// ========================================
// STORE
// ========================================

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  unsavedChanges: false,

  setSession: (id) => set({ sessionId: id }),
  setUnsavedChanges: (flag) => set({ unsavedChanges: flag }),
}));

// ========================================
// NOTES
// ========================================
// Keep state JSON-serializable. Session UUID generation should be
// performed by callers (e.g., Issue 7) using `crypto.randomUUID()`.
// No authentication is implemented for now per project requirements.
