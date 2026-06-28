import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/leaderboard - top 100 players by tokens
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { tokens: 'desc' },
      take: 100,
      select: {
        id: true,
        nickname: true,
        tokens: true,
        tinderBadge: true,
        playerHouse: {
          select: {
            house: {
              select: { name: true },
            },
          },
        },
        playerStats: {
          select: {
            blackjackWinsTotal: true,
          },
        },
      },
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      nickname: user.nickname,
      tokens: user.tokens,
      houseName: user.playerHouse?.house?.name ?? 'Rudera',
      blackjackWinsTotal: user.playerStats?.blackjackWinsTotal ?? 0,
      tinderBadge: user.tinderBadge,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
