import { create } from 'zustand';
import { GameState, RankedMatch } from '../types';

interface SlotResult {
  symbols: string[];
  win: boolean;
  amount: number;
}

interface GameStoreState {
  blackjack: GameState | null;
  slotSpinning: boolean;
  slotResult: SlotResult | null;
  slotSymbols: string[];
  rankedMatch: RankedMatch | null;
  setBlackjack: (state: GameState | null) => void;
  setSlotSpinning: (spinning: boolean) => void;
  setSlotResult: (result: SlotResult | null) => void;
  setSlotSymbols: (symbols: string[]) => void;
  setRankedMatch: (match: RankedMatch | null) => void;
  updateRankedMatch: (partial: Partial<RankedMatch>) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  blackjack: null,
  slotSpinning: false,
  slotResult: null,
  slotSymbols: ['🍒', '🍋', '⭐', '🍋', '🍒', '💎', '7️⃣', '⭐', '🍒'],
  rankedMatch: null,

  setBlackjack: (state) => set({ blackjack: state }),
  setSlotSpinning: (spinning) => set({ slotSpinning: spinning }),
  setSlotResult: (result) => set({ slotResult: result }),
  setSlotSymbols: (symbols) => set({ slotSymbols: symbols }),
  setRankedMatch: (match) => set({ rankedMatch: match }),
  updateRankedMatch: (partial) => {
    const { rankedMatch } = get();
    if (!rankedMatch) return;
    set({ rankedMatch: { ...rankedMatch, ...partial } });
  },
}));
