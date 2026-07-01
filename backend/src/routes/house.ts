import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// POST /api/house/sleep
router.post('/sleep', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { playerHouse: { include: { house: true } } }
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (!user.playerHouse) {
      res.status(400).json({ error: 'Nie masz jeszcze domu, w którym mógłbyś spać! Kup go w sklepie.' });
      return;
    }

    // Restore sleep need to 100
    const updatedNeeds = await prisma.playerNeeds.update({
      where: { userId },
      data: { sleep: 100 },
    });

    res.json({
      success: true,
      message: `🛌 Położyłeś się spać w: ${user.playerHouse.house.name}. Twoja energia została w pełni przywrócona!`,
      needs: updatedNeeds,
    });
  } catch (err) {
    console.error('Sleep error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/house/rob
router.post('/rob', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { targetNickname } = req.body;

    if (!targetNickname) {
      res.status(400).json({ error: 'Nazwa gracza do napadu jest wymagana' });
      return;
    }

    const [user, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { nickname: targetNickname } })
    ]);

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (!target) {
      res.status(404).json({ error: 'Cel napadu nie istnieje' });
      return;
    }

    if (user.id === target.id) {
      res.status(400).json({ error: 'Nie możesz napaść na własny dom!' });
      return;
    }

    // Roll the heist (10% success chance)
    const success = Math.random() < 0.10;

    if (success) {
      // Steal 15% of target's dollars (minimum $100, maximum $5000)
      const stealPercentage = 0.15;
      const baseStolen = target.dollars * stealPercentage;
      const stolenAmount = Math.max(100, Math.min(5000, Math.round(baseStolen * 100) / 100));
      
      const realStolen = Math.min(target.dollars, stolenAmount);

      const [updatedUser, updatedTarget] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { dollars: { increment: realStolen } }
        }),
        prisma.user.update({
          where: { id: target.id },
          data: { dollars: { decrement: realStolen } }
        })
      ]);

      res.json({
        success: true,
        stolen: realStolen,
        message: `🤠 Sukces! Zrobiłeś wjazd na chatę gracza ${targetNickname} i ukradłeś $ ${realStolen.toFixed(2)} USD!`,
        dollars: updatedUser.dollars
      });
    } else {
      // Fail and pay $1000 fine
      const fine = 1000;
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { dollars: { decrement: fine } }
      });

      res.json({
        success: false,
        fine,
        message: `👮 Szeryf złapał Cię na gorącym uczynku! Trafiłeś do aresztu i zapłaciłeś grzywnę $ ${fine.toFixed(2)} USD.`,
        dollars: updatedUser.dollars
      });
    }
  } catch (err) {
    console.error('Rob error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
