// ────────────────────────────────────────────────────────────────────────────
// Slot Machine Service – 9 bębnów (układ 3x3)
// ────────────────────────────────────────────────────────────────────────────
//
// PRAWDOPODOBIEŃSTWO (dla gracza ze 100% szczęściem):
//  60% – brak wygranej (losowe bębny, żaden symbol nie dominuje)
//  20% – 4 takie same  (najsłabsza wygrana)
//   9% – 5 takich samych
//   5% – 6 takich samych
//   3% – 7 takich samych
//   2% – 8 takich samych
//   1% – 9 takich samych (JACKPOT)
//
// Im więcej symboli do dopasowania → tym mniejszy procent szansy.
// ────────────────────────────────────────────────────────────────────────────

export type SlotSymbol = 'cherry' | 'lemon' | 'star' | 'diamond' | 'seven';

export interface SpinResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol, SlotSymbol, SlotSymbol,
          SlotSymbol, SlotSymbol, SlotSymbol, SlotSymbol];
  multiplier: number;
  isBonus: boolean;
}

// Bazowe mnożniki symboli
const SYMBOL_BASE: Record<SlotSymbol, number> = {
  cherry:  1.5,
  lemon:   2,
  star:    3.5,
  diamond: 7,
  seven:   15,
};

// Wszystkie symbole do losowego wypełnienia
const ALL_SYMBOLS: SlotSymbol[] = ['cherry', 'lemon', 'star', 'diamond', 'seven'];

// Wagi (prawdopodobieństwo wylosowania symbolu jako losowy):
// cherry najczęstszy, seven ultrarzadki
const RANDOM_POOL: SlotSymbol[] = [
  'cherry', 'cherry', 'cherry', 'cherry', 'cherry', 'cherry', 'cherry', 'cherry',
  'lemon',  'lemon',  'lemon',  'lemon',  'lemon',
  'star',   'star',   'star',
  'diamond','diamond',
  'seven',
];

function rndSymbol(): SlotSymbol {
  return RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
}

// Generuj 9 bębnów z guaranteed N sztuk danego symbolu (reszta losowa)
function buildReels(symbol: SlotSymbol, count: number): SlotSymbol[] {
  const reels: SlotSymbol[] = [];
  // Wstaw `count` sztuk wybranego symbolu
  for (let i = 0; i < count; i++) reels.push(symbol);
  // Wypełnij resztę – ale NIE tym samym symbolem (żeby nie przekroczyć limitu)
  while (reels.length < 9) {
    const s = rndSymbol();
    if (s !== symbol) reels.push(s);
  }
  // Przetasuj
  for (let i = reels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [reels[i], reels[j]] = [reels[j], reels[i]];
  }
  return reels;
}

// Generuj całkowicie losowe bębny (brak wygranej)
function buildLoseReels(): SlotSymbol[] {
  // Upewniamy się że żaden symbol nie pojawia się 4+ razy
  let reels: SlotSymbol[];
  let attempts = 0;
  do {
    reels = Array.from({ length: 9 }, () => rndSymbol());
    const counts: Record<string, number> = {};
    reels.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount < 4) break;
    attempts++;
  } while (attempts < 100);
  return reels;
}

// Wybierz symbol z wagami (rzadsze symbole pojawiają się rzadziej jako "wygrywający")
// cherry: 50%, lemon: 25%, star: 13%, diamond: 7%, seven: 5%
function pickWinSymbol(): SlotSymbol {
  const r = Math.random();
  if (r < 0.50) return 'cherry';
  if (r < 0.75) return 'lemon';
  if (r < 0.88) return 'star';
  if (r < 0.95) return 'diamond';
  return 'seven';
}

// ─────────────────────────────────────────────────────────────────────────────
// Główna funkcja spinu
// ─────────────────────────────────────────────────────────────────────────────
export function spin(happiness: number = 100): SpinResult {
  // Efekt złego humoru – wymuszamy przegraną
  const happinessMult = Math.max(0.01, happiness / 100);

  // Tabela szans na wygraną z modyfikatorem szczęścia:
  //   [minCount, rawChance]
  // Łącznie: 60% bazowo na brak wygranej
  const winTable: { count: number; rawChance: number }[] = [
    { count: 4, rawChance: 0.20 * happinessMult },  // 4 symbole
    { count: 5, rawChance: 0.09 * happinessMult },  // 5 symboli
    { count: 6, rawChance: 0.05 * happinessMult },  // 6 symboli
    { count: 7, rawChance: 0.03 * happinessMult },  // 7 symboli
    { count: 8, rawChance: 0.02 * happinessMult },  // 8 symboli
    { count: 9, rawChance: 0.01 * happinessMult },  // 9 symboli (jackpot)
  ];

  const roll = Math.random();
  let cumulative = 0;
  let winCount = 0;

  for (const { count, rawChance } of winTable) {
    cumulative += rawChance;
    if (roll < cumulative) {
      winCount = count;
      break;
    }
  }

  let reelArr: SlotSymbol[];
  let matchSymbol: SlotSymbol = 'cherry';
  let multiplier = 0;
  let isBonus = false;

  if (winCount >= 4) {
    matchSymbol = pickWinSymbol();
    reelArr = buildReels(matchSymbol, winCount);

    // Mnożnik: symbol bazowy × bonus za ilość
    const countBonus =
      winCount === 4 ? 1 :
      winCount === 5 ? 2.5 :
      winCount === 6 ? 5 :
      winCount === 7 ? 12 :
      winCount === 8 ? 25 : 60;

    multiplier = Math.floor(SYMBOL_BASE[matchSymbol] * countBonus);

    if (winCount >= 8 && (matchSymbol === 'diamond' || matchSymbol === 'seven')) {
      isBonus = true;
    }
  } else {
    reelArr = buildLoseReels();
    multiplier = 0;
  }

  const reels = reelArr as [
    SlotSymbol, SlotSymbol, SlotSymbol,
    SlotSymbol, SlotSymbol, SlotSymbol,
    SlotSymbol, SlotSymbol, SlotSymbol
  ];

  return { reels, multiplier, isBonus };
}
