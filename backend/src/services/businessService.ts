import { prisma } from '../index';

export interface BusinessDef {
  id: string;
  name: string;
  basePrice: number;
  baseIncomePerMin: number;
  upgradeMultiplier: number;
  incomeMultiplier: number;
  managerPrice: number;
}

export interface RealEstateDef {
  id: string;
  name: string;
  price: number;
  incomePerMin: number;
}

export interface CarDef {
  id: string;
  name: string;
  price: number;
  happinessBonus: number;
}

export const BUSINESSES_CATALOG: Record<string, BusinessDef> = {
  cafe: {
    id: 'cafe',
    name: 'Kawiarnia ☕',
    basePrice: 500,
    baseIncomePerMin: 5,
    upgradeMultiplier: 1.5,
    incomeMultiplier: 1.4,
    managerPrice: 200,
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restauracja 🍔',
    basePrice: 2500,
    baseIncomePerMin: 35,
    upgradeMultiplier: 1.6,
    incomeMultiplier: 1.45,
    managerPrice: 1000,
  },
  supermarket: {
    id: 'supermarket',
    name: 'Supermarket 🛒',
    basePrice: 12000,
    baseIncomePerMin: 200,
    upgradeMultiplier: 1.7,
    incomeMultiplier: 1.5,
    managerPrice: 5000,
  },
  bank: {
    id: 'bank',
    name: 'Prywatny Bank 🏦',
    basePrice: 75000,
    baseIncomePerMin: 1500,
    upgradeMultiplier: 1.8,
    incomeMultiplier: 1.55,
    managerPrice: 30000,
  },
};

export const REAL_ESTATE_CATALOG: Record<string, RealEstateDef> = {
  penthouse: {
    id: 'penthouse',
    name: 'Luksusowy Penthouse 🏙️',
    price: 15000,
    incomePerMin: 80,
  },
  mansion: {
    id: 'mansion',
    name: 'Rezydencja z Basenem 🏰',
    price: 60000,
    incomePerMin: 450,
  },
  private_island: {
    id: 'private_island',
    name: 'Prywatna Wyspa 🏝️',
    price: 350000,
    incomePerMin: 3200,
  },
};

export const CARS_CATALOG: Record<string, CarDef> = {
  sports_car: {
    id: 'sports_car',
    name: 'Sportowy Mustang 🏎️',
    price: 8000,
    happinessBonus: 25,
  },
  supercar: {
    id: 'supercar',
    name: 'Włoski Supercar 🏎️🔥',
    price: 45000,
    happinessBonus: 60,
  },
  hypercar: {
    id: 'hypercar',
    name: 'Złoty Hypercar 👑',
    price: 250000,
    happinessBonus: 100,
  },
};

// Oblicz koszt ulepszenia biznesu
export function getUpgradeCost(businessId: string, currentLevel: number): number {
  const def = BUSINESSES_CATALOG[businessId];
  if (!def) return 0;
  return Math.floor(def.basePrice * Math.pow(def.upgradeMultiplier, currentLevel - 1));
}

// Oblicz zysk na minutę biznesu
export function getIncomePerMin(businessId: string, level: number): number {
  const def = BUSINESSES_CATALOG[businessId];
  if (!def) return 0;
  return Math.floor(def.baseIncomePerMin * Math.pow(def.incomeMultiplier, level - 1));
}

// Naliczanie pasywnego dochodu (offline + automatyczne dla menedżerów i nieruchomości)
export async function processPassiveIncome(userId: string): Promise<{ addedDollars: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      businesses: true,
      realEstates: true,
    },
  });

  if (!user) return { addedDollars: 0 };

  const now = new Date();
  let totalAdded = 0;

  // 1. Zautomatyzowane biznesy (z menedżerem)
  const businessesToUpdate: { id: number; lastCollectedAt: Date }[] = [];
  for (const bus of user.businesses) {
    if (bus.hasManager) {
      const elapsedMs = now.getTime() - new Date(bus.lastCollectedAt).getTime();
      const elapsedMins = Math.floor(elapsedMs / 60000);
      if (elapsedMins > 0) {
        const incomePerMin = getIncomePerMin(bus.businessId, bus.level);
        totalAdded += elapsedMins * incomePerMin;
        businessesToUpdate.push({
          id: bus.id,
          lastCollectedAt: new Date(new Date(bus.lastCollectedAt).getTime() + elapsedMins * 60000),
        });
      }
    }
  }

  // 2. Nieruchomości (zawsze zautomatyzowane, w 100% pasywne!)
  const realEstatesToUpdate: { id: number; lastCollectedAt: Date }[] = [];
  for (const re of user.realEstates) {
    const elapsedMs = now.getTime() - new Date(re.lastCollectedAt).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    if (elapsedMins > 0) {
      const def = REAL_ESTATE_CATALOG[re.estateId];
      if (def) {
        totalAdded += elapsedMins * def.incomePerMin;
        realEstatesToUpdate.push({
          id: re.id,
          lastCollectedAt: new Date(new Date(re.lastCollectedAt).getTime() + elapsedMins * 60000),
        });
      }
    }
  }

  if (totalAdded > 0) {
    // Aktualizuj stan dolarów użytkownika
    await prisma.user.update({
      where: { id: userId },
      data: { dollars: { increment: totalAdded } },
    });

    // Zaktualizuj daty ostatniego zebrania
    for (const b of businessesToUpdate) {
      await prisma.userBusiness.update({
        where: { id: b.id },
        data: { lastCollectedAt: b.lastCollectedAt },
      });
    }

    for (const r of realEstatesToUpdate) {
      await prisma.userRealEstate.update({
        where: { id: r.id },
        data: { lastCollectedAt: r.lastCollectedAt },
      });
    }
  }

  return { addedDollars: totalAdded };
}
