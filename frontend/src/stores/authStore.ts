import { create } from 'zustand';
import { User, Needs } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  needs: Needs;
  isAuthenticated: boolean;
  login: (token: string, user: User, needs: Needs) => void;
  logout: () => void;
  updateTokens: (delta: number) => void;
  updateNeeds: (partial: Partial<Needs>) => void;
  setUser: (user: User) => void;
}

const loadFromStorage = () => {
  try {
    const token = localStorage.getItem('cs_token');
    const userStr = localStorage.getItem('cs_user');
    const needsStr = localStorage.getItem('cs_needs');
    return {
      token,
      user: userStr ? (JSON.parse(userStr) as User) : null,
      needs: needsStr
        ? (JSON.parse(needsStr) as Needs)
        : { sleep: 100, hunger: 100, hydration: 100, happiness: 100 },
    };
  } catch {
    return {
      token: null,
      user: null,
      needs: { sleep: 100, hunger: 100, hydration: 100, happiness: 100 },
    };
  }
};

const saved = loadFromStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: saved.user,
  token: saved.token,
  needs: saved.needs,
  isAuthenticated: !!(saved.token && saved.user),

  login: (token, user, needs) => {
    localStorage.setItem('cs_token', token);
    localStorage.setItem('cs_user', JSON.stringify(user));
    localStorage.setItem('cs_needs', JSON.stringify(needs));
    set({ token, user, needs, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
    localStorage.removeItem('cs_needs');
    set({
      token: null,
      user: null,
      needs: { sleep: 100, hunger: 100, hydration: 100, happiness: 100 },
      isAuthenticated: false,
    });
  },

  updateTokens: (delta) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, tokens: user.tokens + delta };
    localStorage.setItem('cs_user', JSON.stringify(updated));
    set({ user: updated });
  },

  updateNeeds: (partial) => {
    const { needs } = get();
    const updated = { ...needs, ...partial };
    localStorage.setItem('cs_needs', JSON.stringify(updated));
    set({ needs: updated });
  },

  setUser: (user) => {
    localStorage.setItem('cs_user', JSON.stringify(user));
    set({ user });
  },
}));
