// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Hand = Card[];

export type GameOutcome = 'blackjack' | 'win' | 'push' | 'loss';

export interface GameSession {
  userId: string;
  deck: Card[];
  playerHand: Hand;
  dealerHand: Hand;
  bet: number;
  doubled: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Active sessions storage
// ────────────────────────────────────────────────────────────────────────────

export const activeSessions = new Map<string, GameSession>();

// ────────────────────────────────────────────────────────────────────────────
// Deck utilities
// ────────────────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardValue(card: Card): number {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11; // Ace default; adjusted in getHandValue
  return parseInt(card.rank, 10);
}

export function getHandValue(hand: Hand): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  // Reduce aces from 11 to 1 if bust
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export function isBlackjack(hand: Hand): boolean {
  return hand.length === 2 && getHandValue(hand) === 21;
}

// ────────────────────────────────────────────────────────────────────────────
// Game actions
// ────────────────────────────────────────────────────────────────────────────

export function startGame(userId: string, bet: number): GameSession {
  const deck = shuffle(createDeck());

  const playerHand: Hand = [deck.pop()!, deck.pop()!];
  const dealerHand: Hand = [deck.pop()!, deck.pop()!];

  const session: GameSession = {
    userId,
    deck,
    playerHand,
    dealerHand,
    bet,
    doubled: false,
  };

  activeSessions.set(userId, session);
  return session;
}

export function hit(userId: string): GameSession | null {
  const session = activeSessions.get(userId);
  if (!session) return null;

  const card = session.deck.pop();
  if (!card) return null;

  session.playerHand.push(card);

  // If bust, remove session
  if (getHandValue(session.playerHand) > 21) {
    activeSessions.delete(userId);
  }

  return session;
}

export function stand(
  userId: string
): { session: GameSession; outcome: GameOutcome; payout: number } | null {
  const session = activeSessions.get(userId);
  if (!session) return null;

  activeSessions.delete(userId);

  // Dealer draws until >= 17
  while (getHandValue(session.dealerHand) < 17) {
    const card = session.deck.pop();
    if (!card) break;
    session.dealerHand.push(card);
  }

  const { outcome, payout } = resolveGame(session);
  return { session, outcome, payout };
}

export function doubleDown(
  userId: string
): { session: GameSession; outcome: GameOutcome; payout: number } | null {
  const session = activeSessions.get(userId);
  if (!session) return null;

  // Double the bet
  session.bet *= 2;
  session.doubled = true;

  // Draw exactly one card
  const card = session.deck.pop();
  if (card) session.playerHand.push(card);

  // Then stand
  activeSessions.delete(userId);

  // Dealer draws until >= 17
  while (getHandValue(session.dealerHand) < 17) {
    const next = session.deck.pop();
    if (!next) break;
    session.dealerHand.push(next);
  }

  const { outcome, payout } = resolveGame(session);
  return { session, outcome, payout };
}

export interface GameSession {
  userId: string;
  deck: Card[];
  playerHand: Hand;
  dealerHand: Hand;
  bet: number;
  doubled: boolean;
  happiness?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Outcome resolution
// ────────────────────────────────────────────────────────────────────────────

function resolveGame(session: GameSession): { outcome: GameOutcome; payout: number } {
  const playerValue = getHandValue(session.playerHand);
  const dealerValue = getHandValue(session.dealerHand);
  const playerBJ = isBlackjack(session.playerHand);
  const dealerBJ = isBlackjack(session.dealerHand);

  // Sprawdź czy nakładamy karę złego stanu psychicznego (zadowolenie <= 20)
  const happiness = session.happiness ?? 100;
  const rand = Math.random() * 100;
  let forceLoss = false;
  if (happiness <= 10) {
    if (rand < 99) forceLoss = true;
  } else if (happiness <= 20) {
    if (rand < 85) forceLoss = true;
  }

  // W przypadku wymuszonej przegranej, jeśli gracz wygrywa, krupier sztucznie dobiera lepsze karty lub podmieniamy układ
  if (forceLoss) {
    const isPlayerWinning = (playerValue <= 21 && (dealerValue > 21 || playerValue > dealerValue)) || playerBJ;
    if (isPlayerWinning) {
      // Dajemy dealerowi układ wygrywający (np. 21) lub symulujemy przegraną gracza
      return { outcome: 'loss', payout: 0 };
    }
  }

  if (playerBJ && dealerBJ) {
    return { outcome: 'push', payout: session.bet };
  }

  if (playerBJ) {
    // Blackjack pays 3:2
    const payout = session.bet + Math.floor(session.bet * 1.5);
    return { outcome: 'blackjack', payout };
  }

  if (dealerBJ || playerValue > 21) {
    return { outcome: 'loss', payout: 0 };
  }

  if (dealerValue > 21 || playerValue > dealerValue) {
    return { outcome: 'win', payout: session.bet * 2 };
  }

  if (playerValue === dealerValue) {
    return { outcome: 'push', payout: session.bet };
  }

  return { outcome: 'loss', payout: 0 };
}
