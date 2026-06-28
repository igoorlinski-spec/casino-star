export interface User {
  id: string;
  email: string;
  nickname: string;
  tokens: number;
  skinColor: string;
  hairStyle: string;
  characterCreated: boolean;
  hasBag: boolean;
  tinderHearts: number;
  tinderBadge?: string;
  dollars: number;
  playerHouse?: { houseId: number };
  playerStats?: { blackjackWinsTotal: number };
}

export interface Needs {
  sleep: number;
  hunger: number;
  hydration: number;
  happiness: number;
}

export interface House {
  id: number;
  name: string;
  price: number;
  sleepBonus: number;
  hasFridge: boolean;
  hasTap: boolean;
  freeFood: boolean;
}

export interface InventoryItem {
  itemName: string;
  quantity: number;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  tokens: number;
  house: string;
  blackjackWinsTotal: number;
}

export interface Card {
  suit: string;
  value: string;
  numericValue: number;
  rank?: string; // dodano opcjonalny rank dla kompatybilności z serwerem
}

export interface GameState {
  playerHand: Card[];
  dealerHand?: Card[];
  dealerVisible?: Card;
  playerValue: number;
  dealerValue?: number;
  isBlackjack?: boolean;
  bust?: boolean;
  outcome?: string;
  phase: 'betting' | 'playing' | 'done';
  bet: number;
  result?: 'win' | 'lose' | 'push' | 'blackjack';
}

export interface RankedMatch {
  matchId: string;
  opponent: string;
  playerScore: number;
  opponentScore: number;
  game: 'blackjack' | 'slots';
  status: 'searching' | 'playing' | 'finished';
}

export type BadgeLevel = 'Amator' | 'Nowy' | 'Consiliere' | 'Boss' | 'GOAT';
