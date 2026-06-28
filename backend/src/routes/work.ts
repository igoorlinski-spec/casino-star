import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { getRandomQuestion, checkAnswer } from '../services/questionsService';

const router = Router();
router.use(authMiddleware);

// POST /api/work/click - McDonald's: +1 token per click, -1 happiness
router.post('/click', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Pobierz obecne zadowolenie
    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    const currentHappiness = needs?.happiness ?? 100;

    const [updatedUser, updatedNeeds] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: 1 } },
        select: { tokens: true },
      }),
      prisma.playerNeeds.update({
        where: { userId },
        data: { happiness: Math.max(0, currentHappiness - 1) }
      })
    ]);

    res.json({ 
      message: '🍔 Kliknięcie zaliczone! +1 żeton, -1 Zadowolenia', 
      tokens: updatedUser.tokens,
      needs: updatedNeeds
    });
  } catch (err) {
    console.error('Work click error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// GET /api/work/question - get random math question
router.get('/question', (req: Request, res: Response): void => {
  try {
    const question = getRandomQuestion();
    res.json({ question });
  } catch (err) {
    console.error('Get question error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/work/answer - submit answer, +15 tokens if correct, -10 happiness (correct or incorrect)
router.post('/answer', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      res.status(400).json({ error: 'questionId i answer są wymagane' });
      return;
    }

    const isCorrect = checkAnswer(Number(questionId), String(answer));
    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    const currentHappiness = needs?.happiness ?? 100;

    if (isCorrect) {
      const [updatedUser, updatedNeeds] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { tokens: { increment: 15 } },
          select: { tokens: true },
        }),
        prisma.playerNeeds.update({
          where: { userId },
          data: { happiness: Math.max(0, currentHappiness - 10) }
        })
      ]);

      res.json({
        correct: true,
        message: '✅ Poprawna odpowiedź! +15 żetonów, -10 Zadowolenia',
        tokens: updatedUser.tokens,
        needs: updatedNeeds
      });
    } else {
      const [user, updatedNeeds] = await prisma.$transaction([
        prisma.user.findUnique({
          where: { id: userId },
          select: { tokens: true },
        }),
        prisma.playerNeeds.update({
          where: { userId },
          data: { happiness: Math.max(0, currentHappiness - 10) }
        })
      ]);

      res.json({
        correct: false,
        message: '❌ Niepoprawna odpowiedź. -10 Zadowolenia',
        tokens: user?.tokens ?? 0,
        needs: updatedNeeds
      });
    }
  } catch (err) {
    console.error('Work answer error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
