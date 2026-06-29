// ─────────────────────────────────────────────────────────────────────────────
// Stock Market Service
// – 10 fikcyjnych spółek, ceny odświeżane co 60 s nawet offline
// – max: 40× cena startowa   /   min: 10% ceny startowej (-90%)
// – bias w stronę strat (casino house edge)
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../index';

export interface StockDef {
  id: string;
  name: string;
  emoji: string;
  initialPrice: number;
}

export const STOCKS: StockDef[] = [
  { id: 'mcronalds',  name: 'McRonald\'s',      emoji: '🍔', initialPrice: 120  },
  { id: 'amazyn',     name: 'Amazyn',            emoji: '📦', initialPrice: 340  },
  { id: 'techapple',  name: 'TechApple',         emoji: '🍎', initialPrice: 280  },
  { id: 'facepalm',   name: 'Facepalm',          emoji: '😬', initialPrice: 190  },
  { id: 'giggle',     name: 'Giggle Corp',       emoji: '🔍', initialPrice: 310  },
  { id: 'netflux',    name: 'Netflux',           emoji: '🎬', initialPrice: 95   },
  { id: 'teslax',     name: 'TeslaX Motors',     emoji: '⚡', initialPrice: 450  },
  { id: 'cryptocorp', name: 'CryptoCorp',        emoji: '🪙', initialPrice: 60   },
  { id: 'nikair',     name: 'Nik-Air',           emoji: '👟', initialPrice: 170  },
  { id: 'casinostar', name: 'CasinoStar SA',     emoji: '🌟', initialPrice: 500  },
  // ── 5 GIGANTÓW ────────────────────────────────────────────────────────────
  { id: 'mikrosoft',  name: 'MikroSoft',         emoji: '🪟', initialPrice: 1200 },
  { id: 'oilrex',     name: 'OilRex Corp',       emoji: '🛢️', initialPrice: 980  },
  { id: 'spacexstar', name: 'SpaceX-Star',       emoji: '🚀', initialPrice: 2500 },
  { id: 'bankgold',   name: 'BankGold Int.',     emoji: '🏦', initialPrice: 1800 },
  { id: 'pharmamax',  name: 'PharmaMax',         emoji: '💊', initialPrice: 1500 },
];

// ── Algorytm zmiany ceny (per minuta) ────────────────────────────────────────
// Rozkład wyników (suma szans = 1):
//   45% → mała strata (-1% do -4%)
//   25% → duża strata (-4% do -12%)
//   15% → krach (-12% do -25%)
//   10% → mały wzrost (+0.5% do +4%)   ← było 20%
//    3% → duży wzrost (+4% do +18%)    ← było 7%
//    2% → spike (+18% do +60%)         ← było 3%
// Średnia EV ≈ -3.5% / minutę → portfel topnieje bardzo szybko

function rollPriceChange(): number {
  const r = Math.random();
  if (r < 0.45) return -(Math.random() * 3 + 1) / 100;      // mała strata
  if (r < 0.70) return -(Math.random() * 8 + 4) / 100;      // duża strata
  if (r < 0.85) return -(Math.random() * 13 + 12) / 100;    // krach
  if (r < 0.95) return  (Math.random() * 3.5 + 0.5) / 100;  // mały wzrost
  if (r < 0.98) return  (Math.random() * 14 + 4) / 100;     // duży wzrost
  return (Math.random() * 42 + 18) / 100;                    // spike
}

// ── Seed – wywołaj raz przy starcie serwera ───────────────────────────────────
export async function seedStocks(): Promise<void> {
  for (const s of STOCKS) {
    await prisma.stock.upsert({
      where: { id: s.id },
      update: {},   // nie nadpisuj istniejących (żeby nie resetować cen)
      create: {
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        price: s.initialPrice,
        initialPrice: s.initialPrice,
        lastUpdatedAt: new Date(),
      },
    });
  }
  console.log('✅ Stocks seeded');
}

// ── Tick – aktualizuj ceny wszystkich spółek ──────────────────────────────────
export async function tickStocks(): Promise<void> {
  const stocks = await prisma.stock.findMany();
  for (const stock of stocks) {
    const change = rollPriceChange();
    let newPrice = stock.price * (1 + change);

    // Granice
    const minPrice = stock.initialPrice * 0.10;   // -90%
    const maxPrice = stock.initialPrice * 40;      // 40×
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
    newPrice = Math.round(newPrice * 100) / 100;   // 2 miejsca po przecinku

    await prisma.stock.update({
      where: { id: stock.id },
      data: { price: newPrice, lastUpdatedAt: new Date() },
    });
  }
}

// ── Uruchamia automatyczny ticker (co 60 s) ───────────────────────────────────
export function startStockTicker(): void {
  console.log('📈 Stock market ticker started (60s interval)');
  setInterval(async () => {
    try {
      await tickStocks();
    } catch (err) {
      console.error('Stock tick error:', err);
    }
  }, 60_000);
}
