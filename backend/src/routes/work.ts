import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { getRandomQuestion, checkAnswer } from '../services/questionsService';

const router = Router();
router.use(authMiddleware);

// POST /api/work/click
// Zarobek = (1 + burgerBonusLevel) * 2^burgerMultLevel
router.post('/click', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [user, needs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { tokens: true, burgerMultLevel: true, burgerBonusLevel: true } }),
      prisma.playerNeeds.findUnique({ where: { userId } }),
    ]);

    const currentHappiness = needs?.happiness ?? 100;
    const bonusLevel = user?.burgerBonusLevel ?? 0;

    // Zarobek = 1 + bonusLevel (maksymalnie 6)
    const earn = 1 + bonusLevel;

    const [updatedUser, updatedNeeds] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: earn } },
        select: { tokens: true, burgerMultLevel: true, burgerBonusLevel: true },
      }),
      prisma.playerNeeds.update({
        where: { userId },
        data: { happiness: Math.max(0, currentHappiness - 1) }
      })
    ]);

    res.json({
      message: `🍔 +${earn} żeton${earn === 1 ? '' : 'ów'}!`,
      earn,
      tokens: updatedUser.tokens,
      needs: updatedNeeds,
      burgerMultLevel: updatedUser.burgerMultLevel,
      burgerBonusLevel: updatedUser.burgerBonusLevel,
    });
  } catch (err) {
    console.error('Work click error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/work/upgrade-mult - x2 burger (maks 3x, koszt 1000 żetonów)
router.post('/upgrade-mult', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const MAX_LEVEL = 3;
    const COST = 1000;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true, burgerMultLevel: true } });
    if (!user) { res.status(404).json({ error: 'Nie znaleziono użytkownika' }); return; }
    if (user.burgerMultLevel >= MAX_LEVEL) { res.status(400).json({ error: `Maks poziom (${MAX_LEVEL}) osiągnięty!` }); return; }
    if (user.tokens < COST) { res.status(400).json({ error: `Potrzebujesz ${COST} żetonów!` }); return; }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { decrement: COST }, burgerMultLevel: { increment: 1 } },
      select: { tokens: true, burgerMultLevel: true, burgerBonusLevel: true },
    });

    res.json({
      message: `🍔 Burger x${Math.pow(2, updated.burgerMultLevel)} odblokowany! (${updated.burgerMultLevel}/${MAX_LEVEL})`,
      tokens: updated.tokens,
      burgerMultLevel: updated.burgerMultLevel,
      burgerBonusLevel: updated.burgerBonusLevel,
    });
  } catch (err) {
    console.error('Upgrade mult error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/work/upgrade-bonus - +1/klik (maks 5x, koszt 1000 żetonów)
router.post('/upgrade-bonus', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const MAX_LEVEL = 5;
    const COST = 1000;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true, burgerBonusLevel: true } });
    if (!user) { res.status(404).json({ error: 'Nie znaleziono użytkownika' }); return; }
    if (user.burgerBonusLevel >= MAX_LEVEL) { res.status(400).json({ error: `Maks poziom (${MAX_LEVEL}) osiągnięty!` }); return; }
    if (user.tokens < COST) { res.status(400).json({ error: `Potrzebujesz ${COST} żetonów!` }); return; }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { decrement: COST }, burgerBonusLevel: { increment: 1 } },
      select: { tokens: true, burgerMultLevel: true, burgerBonusLevel: true },
    });

    res.json({
      message: `🍔 +${updated.burgerBonusLevel}/klik odblokowany! (${updated.burgerBonusLevel}/${MAX_LEVEL})`,
      tokens: updated.tokens,
      burgerMultLevel: updated.burgerMultLevel,
      burgerBonusLevel: updated.burgerBonusLevel,
    });
  } catch (err) {
    console.error('Upgrade bonus error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// GET /api/work/question
router.get('/question', (req: Request, res: Response): void => {
  try {
    res.json({ question: getRandomQuestion() });
  } catch (err) {
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/work/answer
router.post('/answer', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { questionId, answer } = req.body;
    if (!questionId || !answer) { res.status(400).json({ error: 'questionId i answer są wymagane' }); return; }

    const isCorrect = checkAnswer(Number(questionId), String(answer));
    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    const currentHappiness = needs?.happiness ?? 100;

    if (isCorrect) {
      const [updatedUser, updatedNeeds] = await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { tokens: { increment: 15 } }, select: { tokens: true } }),
        prisma.playerNeeds.update({ where: { userId }, data: { happiness: Math.max(0, currentHappiness - 10) } })
      ]);
      res.json({ correct: true, message: '✅ Poprawna odpowiedź! +15 żetonów', tokens: updatedUser.tokens, needs: updatedNeeds });
    } else {
      const [user, updatedNeeds] = await prisma.$transaction([
        prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } }),
        prisma.playerNeeds.update({ where: { userId }, data: { happiness: Math.max(0, currentHappiness - 10) } })
      ]);
      res.json({ correct: false, message: '❌ Niepoprawna odpowiedź.', tokens: user?.tokens ?? 0, needs: updatedNeeds });
    }
  } catch (err) {
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
