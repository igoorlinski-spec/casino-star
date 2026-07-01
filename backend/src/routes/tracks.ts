import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// In-memory state shared across all users
let currentIntervalId = 0;
let currentVictim: any = null;
let isClaimed = false;
let claimedBy: string | null = null;
let claimerUserId: string | null = null;

// Helper to check and spawn a victim for the current 3-minute interval
function checkAndSpawn() {
  const now = Date.now();
  const intervalId = Math.floor(now / 180000); // 3 minutes = 180,000 ms

  if (intervalId !== currentIntervalId) {
    currentIntervalId = intervalId;
    isClaimed = false;
    claimedBy = null;
    claimerUserId = null;

    // Roll for victim (80% chance total)
    const roll = Math.random();
    if (roll < 0.03) {
      currentVictim = { id: 'prince', name: 'Książę Indii 👑', rescue: 10000, bury: 2000, risk: false };
    } else if (roll < 0.10) {
      currentVictim = { id: 'prince_son', name: 'Syn Księcia Indii 👶', rescue: 5000, bury: 1000, risk: false };
    } else if (roll < 0.20) {
      currentVictim = { id: 'smart', name: 'Inteligentny Hindus 🧠', rescue: 2500, bury: 670, risk: false };
    } else if (roll < 0.40) {
      currentVictim = { id: 'normal', name: 'Normalny Hindus 👨', rescue: 1200, bury: 500, risk: false };
    } else if (roll < 0.60) {
      currentVictim = { id: 'ganges', name: 'Gangeski Hindus 🌊', rescue: 1000, bury: 500, risk: true }; // 50% hospital risk
    } else if (roll < 0.80) {
      currentVictim = { id: 'stupid', name: 'Głupi Hindus 🤪', rescue: 500, bury: 250, risk: false };
    } else {
      currentVictim = null; // No victim this interval
    }

    if (currentVictim) {
      const items: any[] = [];
      items.push({ id: 'remains', name: 'Szczątki i popioły', value: 0, emoji: '⚱️' });
      items.push({ id: 'trash', name: 'Śmieci (nagroda za sprzątanie)', value: 50, emoji: '🗑️' });
      if (Math.random() < 0.50) {
        items.push({ id: 'food', name: 'Obrzydliwe żarcie', value: 3, emoji: '🤢' });
      }
      if (Math.random() < 0.20) {
        items.push({ id: 'dagger', name: 'Sztylet Hindusa', value: 100, emoji: '🗡️' });
      }
      if (Math.random() < 0.10) {
        items.push({ id: 'amulet', name: 'Amulet Hindusa', value: 500, emoji: '🧿' });
      }
      currentVictim.items = items;
    }
  }
}

// GET /api/tracks/state
router.get('/state', async (req: Request, res: Response): Promise<void> => {
  try {
    checkAndSpawn();
    const now = Date.now();
    const timeLeft = 180 - (Math.floor(now / 1000) % 180);

    res.json({
      active: currentVictim !== null && !isClaimed,
      victim: isClaimed ? null : currentVictim,
      claimedBy,
      isYours: isClaimed && claimerUserId === req.user!.id,
      timeLeft
    });
  } catch (err) {
    console.error('Tracks state error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/tracks/claim
router.post('/claim', async (req: Request, res: Response): Promise<void> => {
  try {
    checkAndSpawn();
    const userId = req.user!.id;

    if (!currentVictim) {
      res.status(400).json({ error: 'Na torach nie ma teraz nikogo.' });
      return;
    }

    if (isClaimed) {
      res.status(400).json({ error: `Spóźniłeś się! Rewolwerowiec ${claimedBy} już zajął to ciało.` });
      return;
    }

    isClaimed = true;
    claimedBy = req.user!.nickname;
    claimerUserId = userId;

    res.json({
      success: true,
      victim: currentVictim
    });
  } catch (err) {
    console.error('Tracks claim error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/tracks/action
router.post('/action', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { action, success } = req.body; // action: 'bury' | 'rescue', success: boolean

    checkAndSpawn();

    if (!isClaimed || claimerUserId !== userId) {
      res.status(400).json({ error: 'Nie masz prawa do tego ciała!' });
      return;
    }

    if (!currentVictim) {
      res.status(400).json({ error: 'Ofiara zniknęła (minął czas).' });
      return;
    }

    let payout = 0;
    let hospitalCost = 0;
    let message = '';

    if (action === 'bury') {
      payout = currentVictim.bury;
      message = `🪦 Pochowałeś postać: ${currentVictim.name}. Otrzymałeś $ ${payout} USD od szeryfa za uporządkowanie torów.`;
    } else if (action === 'rescue') {
      const survived = success && Math.random() < 0.65;
      if (survived) {
        payout = currentVictim.rescue;
        message = `💖 Sukces! Reanimacja przebiegła pomyślnie. ${currentVictim.name} przeżył i w ramach wdzięczności przekazał Ci $ ${payout} USD!`;
      } else {
        message = `😢 Reanimacja nie powiodła się. ${currentVictim.name} odszedł na Twoich rękach. Nic nie zarobiłeś.`;
      }
    } else {
      res.status(400).json({ error: 'Nieprawidłowa akcja' });
      return;
    }

    // 50% chance of contamination if it was a Ganges Hindu
    if (currentVictim.id === 'ganges' && Math.random() < 0.50) {
      hospitalCost = 1500;
      message += ` 🦠 Ponadto gangeskie wody Cię skaziły! Szeryf przetransportował Cię do szpitala polowego (koszt leczenia: $ 1500 USD).`;
    }

    // Add item rewards
    const lootValue = currentVictim.items ? currentVictim.items.reduce((sum: number, item: any) => sum + item.value, 0) : 0;
    const finalDelta = payout - hospitalCost + lootValue;

    if (lootValue > 0) {
      const itemsList = currentVictim.items.map((it: any) => `${it.emoji} ${it.name} ($${it.value})`).join(', ');
      message += `\n🎁 Zebrałeś z torów: ${itemsList}. Wartość zebranych rzeczy: $ ${lootValue} USD.`;
    }

    // Apply payout & hospital cost in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        dollars: {
          increment: finalDelta
        }
      }
    });

    // Reset victim state immediately so it's cleared
    currentVictim = null;
    isClaimed = false;
    claimedBy = null;
    claimerUserId = null;

    res.json({
      success: true,
      message,
      dollars: updatedUser.dollars
    });
  } catch (err) {
    console.error('Tracks action error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
