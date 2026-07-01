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

export default router;
