// ────────────────────────────────────────────────────────────────────────────
// Płock Event Slot Machine Service – 16 bębnów (układ 4x4)
// ────────────────────────────────────────────────────────────────────────────
//
// PRAWDOPODOBIEŃSTWO (dla gracza ze 100% szczęściem):
//  60% – brak wygranej (losowe bębny, żaden symbol nie dominuje)
//  20% – 4-6 takie same (zwykła wygrana)
//  14.99% – 7-10 takich samych (średnia wygrana)
//  5% – 11-15 takich samych (wysoka wygrana)
//  0.01% – 16 takich samych (SUPER JACKPOT - 0.01% szans!)
// ────────────────────────────────────────────────────────────────────────────

export type PlockSymbol = 'kebab' | 'kielbasa' | 'syrenka' | 'orzel' | 'zubr';

export interface PlockSpinResult {
  reels: PlockSymbol[];
  multiplier: number;
  isBonus: boolean;
}

// Polskie symbole eventowe
const SYMBOL_BASE: Record<PlockSymbol, number> = {
  kebab: 1.5,
  kielbasa: 2,
  syrenka: 4,
  zubr: 8,
  orzel: 25, // Najlepszy symbol do Jackpota
};

const ALL_SYMBOLS: PlockSymbol[] = ['kebab', 'kielbasa', 'syrenka', 'zubr', 'orzel'];

const RANDOM_POOL: PlockSymbol[] = [
  'kebab', 'kebab', 'kebab', 'kebab', 'kebab', 'kebab',
  'kielbasa', 'kielbasa', 'kielbasa', 'kielbasa',
  'syrenka', 'syrenka', 'syrenka',
  'zubr', 'zubr',
  'orzel',
];

function rndSymbol(): PlockSymbol {
  return RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
}

function buildReels(symbol: PlockSymbol, count: number): PlockSymbol[] {
  const reels: PlockSymbol[] = [];
  for (let i = 0; i < count; i++) reels.push(symbol);
  while (reels.length < 16) {
    const s = rndSymbol();
    if (s !== symbol) reels.push(s);
  }
  for (let i = reels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [reels[i], reels[j]] = [reels[j], reels[i]];
  }
  return reels;
}

function buildLoseReels(): PlockSymbol[] {
  let reels: PlockSymbol[];
  let attempts = 0;
  do {
    reels = Array.from({ length: 16 }, () => rndSymbol());
    const counts: Record<string, number> = {};
    reels.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount < 4) break;
    attempts++;
  } while (attempts < 100);
  return reels;
}

function pickWinSymbol(): PlockSymbol {
  const r = Math.random();
  if (r < 0.45) return 'kebab';
  if (r < 0.75) return 'kielbasa';
  if (r < 0.90) return 'syrenka';
  if (r < 0.97) return 'zubr';
  return 'orzel';
}

export function spinPlock(happiness: number = 100): PlockSpinResult {
  const happinessMult = Math.max(0.01, happiness / 100);

  // Tabela prawdopodobieństwa – każda szansa zmniejszona o 6% (×0.94)
  // Im większa wygrana tym mniejsza szansa.
  const winTable = [
    { count: 4, rawChance: 0.1034 * happinessMult }, // 10.34% (było 11%)
    { count: 5, rawChance: 0.0517 * happinessMult }, // 5.17%  (było 5.5%)
    { count: 6, rawChance: 0.0329 * happinessMult }, // 3.29%  (było 3.5%)
    { count: 7, rawChance: 0.016 * happinessMult },  // 1.60%  (było 1.7%)
    { count: 8, rawChance: 0.0122 * happinessMult }, // 1.22%  (było 1.3%)
    { count: 9, rawChance: 0.0066 * happinessMult }, // 0.66%  (było 0.7%)
    { count: 10, rawChance: 0.0038 * happinessMult },// 0.38%  (było 0.4%)
    { count: 11, rawChance: 0.0019 * happinessMult },// 0.19%  (było 0.2%)
    { count: 12, rawChance: 0.00094 * happinessMult },// 0.094% (było 0.1%)
    { count: 13, rawChance: 0.00047 * happinessMult },// 0.047% (było 0.05%)
    { count: 14, rawChance: 0.000188 * happinessMult },// 0.019% (było 0.02%)
    { count: 15, rawChance: 0.000094 * happinessMult },// 0.009% (było 0.01%)
    { count: 16, rawChance: 0.000094 * happinessMult },// 0.009% (było 0.01%)
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

  let reelArr: PlockSymbol[];
  let matchSymbol: PlockSymbol = 'kebab';
  let multiplier = 0;
  let isBonus = false;

  if (winCount >= 4) {
    matchSymbol = pickWinSymbol();
    reelArr = buildReels(matchSymbol, winCount);

    // Mnożnik za dopasowanie - ZWIĘKSZONY, aby gracze zarabiali dużo siana!
    const countBonus =
      winCount <= 4 ? 2.5 :
      winCount === 5 ? 4.5 :
      winCount === 6 ? 7.0 :
      winCount === 7 ? 12.0 :
      winCount === 8 ? 20.0 :
      winCount === 9 ? 35.0 :
      winCount === 10 ? 60.0 :
      winCount === 11 ? 100.0 :
      winCount === 12 ? 200.0 :
      winCount === 13 ? 500.0 :
      winCount === 14 ? 1200.0 :
      winCount === 15 ? 3000.0 : 12000.0; // Mega jackpot!

    multiplier = Math.floor(SYMBOL_BASE[matchSymbol] * countBonus);
    if (winCount === 16) {
      isBonus = true;
    }
  } else {
    reelArr = buildLoseReels();
    multiplier = 0;
  }

  return { reels: reelArr, multiplier, isBonus };
}
