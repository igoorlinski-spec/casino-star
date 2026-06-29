// ────────────────────────────────────────────────────────────────────────────
// Płock Event Slot Machine Service – 16 bębnów (układ 4x4)
// ────────────────────────────────────────────────────────────────────────────
//
// PRAWDOPODOBIEŃSTWO (dla gracza ze 100% szczęściem):
//  70% – brak wygranej
//  16% – 4-6 takie same (mała wygrana)
//  10% – 7-10 takich samych (średnia wygrana)
//  4%  – 11-15 takich samych (wysoka wygrana)
//  0.01% – 16 takich samych (SUPER JACKPOT)
// ────────────────────────────────────────────────────────────────────────────

export type PlockSymbol = 'kebab' | 'kielbasa' | 'syrenka' | 'orzel' | 'zubr';

export interface PlockSpinResult {
  reels: PlockSymbol[];
  multiplier: number;
  isBonus: boolean;
}

// Polskie symbole eventowe — obniżone bazy
const SYMBOL_BASE: Record<PlockSymbol, number> = {
  kebab: 0.8,
  kielbasa: 1.2,
  syrenka: 2,
  zubr: 4,
  orzel: 10, // Najlepszy symbol
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

  // Mocno zmniejszone szanse na wygraną
  const winTable = [
    { count: 4,  rawChance: 0.025  * happinessMult },
    { count: 5,  rawChance: 0.012  * happinessMult },
    { count: 6,  rawChance: 0.006  * happinessMult },
    { count: 7,  rawChance: 0.003  * happinessMult },
    { count: 8,  rawChance: 0.002  * happinessMult },
    { count: 9,  rawChance: 0.001  * happinessMult },
    { count: 10, rawChance: 0.0005 * happinessMult },
    { count: 11, rawChance: 0.0002 * happinessMult },
    { count: 12, rawChance: 0.0001 * happinessMult },
    { count: 13, rawChance: 0.00005 * happinessMult },
    { count: 14, rawChance: 0.00002 * happinessMult },
    { count: 15, rawChance: 0.00001 * happinessMult },
    { count: 16, rawChance: 0.00001 * happinessMult }, // SUPER JACKPOT
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

    // Obniżone mnożniki – nie przepala portfela gracza
    const countBonus =
      winCount <= 4  ? 1.2 :
      winCount === 5  ? 2.0 :
      winCount === 6  ? 3.0 :
      winCount === 7  ? 5.0 :
      winCount === 8  ? 8.0 :
      winCount === 9  ? 14.0 :
      winCount === 10 ? 25.0 :
      winCount === 11 ? 45.0 :
      winCount === 12 ? 90.0 :
      winCount === 13 ? 200.0 :
      winCount === 14 ? 500.0 :
      winCount === 15 ? 1200.0 : 5000.0; // Mega jackpot

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

  // Tabela prawdopodobieństwa – każda szansa zmniejszona łącznie o ~10% vs oryginał
  // Im większa wygrana tym mniejsza szansa.
  const winTable = [
    { count: 4, rawChance: 0.0993 * happinessMult }, // 9.93%  (−6%, −4%)
    { count: 5, rawChance: 0.0496 * happinessMult }, // 4.96%
    { count: 6, rawChance: 0.0316 * happinessMult }, // 3.16%
    { count: 7, rawChance: 0.0154 * happinessMult }, // 1.54%
    { count: 8, rawChance: 0.0117 * happinessMult }, // 1.17%
    { count: 9, rawChance: 0.00634 * happinessMult },// 0.63%
    { count: 10, rawChance: 0.00365 * happinessMult },// 0.37%
    { count: 11, rawChance: 0.00182 * happinessMult },// 0.18%
    { count: 12, rawChance: 0.0009 * happinessMult }, // 0.09%
    { count: 13, rawChance: 0.00045 * happinessMult },// 0.045%
    { count: 14, rawChance: 0.00018 * happinessMult },// 0.018%
    { count: 15, rawChance: 0.00009 * happinessMult },// 0.009%
    { count: 16, rawChance: 0.00009 * happinessMult },// 0.009% (SUPER JACKPOT)
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
