import { prisma } from '../index';

export const NEEDS_DECAY = {
  ranked: { sleep: 5, hunger: 10, hydration: 15, happiness: 5 },
  solo: { sleep: 2.5, hunger: 5, hydration: 7.5, happiness: 2.5 },
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
