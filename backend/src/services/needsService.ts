import { prisma } from '../index';

export const NEEDS_DECAY = {
  ranked: { sleep: 5, hunger: 7, hydration: 10, happiness: 5 },
  solo: { sleep: 2.5, hunger: 3.5, hydration: 5, happiness: 2.5 },
} as const;

type Mode = keyof typeof NEEDS_DECAY;

/**
 * Applies needs decay for the given game mode.
 * Subtracts values from player needs (minimum 0) and saves to DB.
 * Returns the updated needs.
 */
export async function applyNeedsDecay(userId: string, mode: Mode) {
  const decay = NEEDS_DECAY[mode];

  const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
  if (!needs) {
    throw new Error(`PlayerNeeds not found for userId: ${userId}`);
  }

  // Naliczanie alimentów za odznaki Tindera (Srebro: $15, Złoto: $40 za każdą rozegraną grę!)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tinderBadge: true }
  });

  let alimony = 0;
  if (user?.tinderBadge === 'silver') alimony = 15;
  if (user?.tinderBadge === 'gold') alimony = 40;

  if (alimony > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { dollars: { decrement: alimony } }
    });
  }

  const updatedNeeds = await prisma.playerNeeds.update({
    where: { userId },
    data: {
      sleep: Math.max(0, needs.sleep - decay.sleep),
      hunger: Math.max(0, needs.hunger - decay.hunger),
      hydration: Math.max(0, needs.hydration - decay.hydration),
      happiness: Math.max(0, (needs.happiness || 100) - decay.happiness),
    },
  });

  return updatedNeeds;
}

/**
 * Calculates and subtracts passive needs decay since last update.
 * Hunger & Hydration: 100 points over 30 minutes (1800s).
 * Happiness: 100 points over 20 minutes (1200s).
 */
export async function processPassiveNeedsDecay(userId: string) {
  const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
  if (!needs) return null;

  const now = Date.now();
  const elapsedSec = (now - new Date(needs.updatedAt).getTime()) / 1000;

  if (elapsedSec > 5) {
    const hungerDecay = elapsedSec * (100 / 1800); // 30 mins
    const hydrationDecay = elapsedSec * (100 / 1800); // 30 mins
    const happinessDecay = elapsedSec * (100 / 1200); // 20 mins

    return await prisma.playerNeeds.update({
      where: { userId },
      data: {
        hunger: Math.max(0, needs.hunger - hungerDecay),
        hydration: Math.max(0, needs.hydration - hydrationDecay),
        happiness: Math.max(0, needs.happiness - happinessDecay)
      }
    });
  }

  return needs;
}
