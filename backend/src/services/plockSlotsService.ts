// ────────────────────────────────────────────────────────────────────────────
// Płock Event Slot Machine Service – 16 bębnów (układ 4x4)
// ────────────────────────────────────────────────────────────────────────────
//
// PRAWDOPODOBIEŃSTWO:
//  ~65% – brak wygranej
//  ~25% – mała wygrana  (count 4-6)   → 1x – 2x stawki
//   ~8% – średnia wygrana (count 7-10) → 2x – 5x stawki
//   ~2% – duża wygrana  (count 11-16) → 10x – 100x stawki
// ────────────────────────────────────────────────────────────────────────────

export type PlockSymbol = 'kebab' | 'kielbasa' | 'syrenka' | 'orzel' | 'zubr';

export interface PlockSpinResult {
  reels: PlockSymbol[];
  multiplier: number;
  isBonus: boolean;
}

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
  return reels!;
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

  // ─────────────────────────────────────────────────────────────────────
  // TABELA WYGRANYCH:
  //   ~65% – brak wygranej
  //   ~25% – mała wygrana  (count 4-6)   → 1x – 2x
  //    ~8% – średnia wygrana (count 7-10) → 2x – 5x
  //    ~2% – duża wygrana  (count 11-16) → 10x – 100x
  // ─────────────────────────────────────────────────────────────────────
  const winTable = [
    // Małe wygrane ~25%
    { count: 4,  rawChance: 0.13   * happinessMult }, // 13%
    { count: 5,  rawChance: 0.07   * happinessMult }, // 7%
    { count: 6,  rawChance: 0.05   * happinessMult }, // 5%
    // Średnie wygrane ~8%
    { count: 7,  rawChance: 0.04   * happinessMult }, // 4%
    { count: 8,  rawChance: 0.025  * happinessMult }, // 2.5%
    { count: 9,  rawChance: 0.01   * happinessMult }, // 1%
    { count: 10, rawChance: 0.005  * happinessMult }, // 0.5%
    // Duże wygrane ~2%
    { count: 11, rawChance: 0.01   * happinessMult }, // 1%
    { count: 12, rawChance: 0.005  * happinessMult }, // 0.5%
    { count: 13, rawChance: 0.003  * happinessMult }, // 0.3%
    { count: 14, rawChance: 0.001  * happinessMult }, // 0.1%
    { count: 15, rawChance: 0.0005 * happinessMult }, // 0.05%
    { count: 16, rawChance: 0.0005 * happinessMult }, // 0.05% SUPER JACKPOT
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

    // Mnożniki bezpośrednie – dokładnie jak w specyfikacji
    multiplier =
      winCount === 4  ? 1   :  // mała: 1x
      winCount === 5  ? 1   :  // mała: 1x
      winCount === 6  ? 2   :  // mała: 2x
      winCount === 7  ? 2   :  // średnia: 2x
      winCount === 8  ? 3   :  // średnia: 3x
      winCount === 9  ? 4   :  // średnia: 4x
      winCount === 10 ? 5   :  // średnia: 5x
      winCount === 11 ? 10  :  // duża: 10x
      winCount === 12 ? 15  :  // duża: 15x
      winCount === 13 ? 25  :  // duża: 25x
      winCount === 14 ? 35  :  // duża: 35x
      winCount === 15 ? 50  :  // duża: 50x
      100;                     // SUPER JACKPOT: 100x

    if (winCount >= 15) isBonus = true;
  } else {
    reelArr = buildLoseReels();
    multiplier = 0;
  }

  return { reels: reelArr, multiplier, isBonus };
}
