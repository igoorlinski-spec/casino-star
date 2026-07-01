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
