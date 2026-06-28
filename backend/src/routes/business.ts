import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { 
  BUSINESSES_CATALOG, 
  REAL_ESTATE_CATALOG, 
  CARS_CATALOG, 
  getUpgradeCost, 
  getIncomePerMin,
  processPassiveIncome
} from '../services/businessService';

const router = Router();

// GET /api/business - Get status of investments and catalogs
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Najpierw procesujemy dochód pasywny, żeby wartości w bazie były aktualne
    await processPassiveIncome(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: true,
        realEstates: true,
        cars: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    // Obliczamy aktualne, niezgromadzone jeszcze zyski dla biznesów bez menedżera
    const now = new Date();
    const businessesWithEarnings = user.businesses.map(bus => {
      let uncollected = 0;
      if (!bus.hasManager) {
        const elapsedMs = now.getTime() - new Date(bus.lastCollectedAt).getTime();
        const elapsedMins = Math.min(1440, Math.floor(elapsedMs / 60000)); // limit 24h bez menedżera
        if (elapsedMins > 0) {
          uncollected = elapsedMins * getIncomePerMin(bus.businessId, bus.level);
        }
      }
      return {
        ...bus,
        uncollected,
        nextUpgradeCost: getUpgradeCost(bus.businessId, bus.level),
        incomePerMin: getIncomePerMin(bus.businessId, bus.level),
      };
    });

    res.json({
      dollars: user.dollars,
      tokens: user.tokens,
      businesses: businessesWithEarnings,
      realEstates: user.realEstates,
      cars: user.cars,
      catalogs: {
        businesses: BUSINESSES_CATALOG,
        realEstate: REAL_ESTATE_CATALOG,
        cars: CARS_CATALOG,
      }
    });
  } catch (err) {
    console.error('Get business error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/business/exchange - Exchange tokens for USD (10 tokens = $1)
router.post('/exchange', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { tokenAmount } = req.body; // Ilość żetonów do wymiany

    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
      res.status(400).json({ error: 'Nieprawidłowa ilość żetonów' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (user.tokens < tokenAmount) {
      res.status(400).json({ error: 'Niewystarczająca ilość żetonów' });
      return;
    }

    // Kurs wymiany: 10 żetonów = $1 USD
    const dollarsGained = tokenAmount / 10;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: { decrement: tokenAmount },
        dollars: { increment: dollarsGained }
      },
      select: { tokens: true, dollars: true }
    });

    res.json({
      message: `Pomyślnie wymieniono 🪙 ${tokenAmount} żetonów na $ ${dollarsGained.toFixed(2)} USD!`,
      tokens: updatedUser.tokens,
      dollars: updatedUser.dollars
    });
  } catch (err) {
    console.error('Exchange error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/business/buy - Buy a new business, property or car
router.post('/buy', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { itemType, itemId } = req.body; // itemType: 'business' | 'real_estate' | 'car'

    if (!itemType || !itemId) {
      res.status(400).json({ error: 'Brakujące parametry' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (itemType === 'business') {
      const def = BUSINESSES_CATALOG[itemId];
      if (!def) {
        res.status(400).json({ error: 'Nieprawidłowy identyfikator biznesu' });
        return;
      }

      // Sprawdź czy gracz już ma ten biznes
      const existing = await prisma.userBusiness.findUnique({
        where: { userId_businessId: { userId, businessId: itemId } }
      });
      if (existing) {
        res.status(400).json({ error: 'Posiadasz już ten biznes!' });
        return;
      }

      if (user.dollars < def.basePrice) {
        res.status(400).json({ error: `Niewystarczające środki! Potrzebujesz $ ${def.basePrice}` });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { dollars: { decrement: def.basePrice } }
        }),
        prisma.userBusiness.create({
          data: { userId, businessId: itemId, level: 1, lastCollectedAt: new Date() }
        })
      ]);

      res.json({ message: `Pomyślnie zakupiono biznes: ${def.name}!` });

    } else if (itemType === 'real_estate') {
      const def = REAL_ESTATE_CATALOG[itemId];
      if (!def) {
        res.status(400).json({ error: 'Nieprawidłowy identyfikator nieruchomości' });
        return;
      }

      const existing = await prisma.userRealEstate.findUnique({
        where: { userId_estateId: { userId, estateId: itemId } }
      });
      if (existing) {
        res.status(400).json({ error: 'Posiadasz już tę nieruchomość!' });
        return;
      }

      if (user.dollars < def.price) {
        res.status(400).json({ error: `Niewystarczające środki! Potrzebujesz $ ${def.price}` });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { dollars: { decrement: def.price } }
        }),
        prisma.userRealEstate.create({
          data: { userId, estateId: itemId, lastCollectedAt: new Date() }
        })
      ]);

      res.json({ message: `Zakupiono nieruchomość: ${def.name}! Rent jest naliczany automatycznie.` });

    } else if (itemType === 'car') {
      const def = CARS_CATALOG[itemId];
      if (!def) {
        res.status(400).json({ error: 'Nieprawidłowy identyfikator samochodu' });
        return;
      }

      const existing = await prisma.userCar.findUnique({
        where: { userId_carId: { userId, carId: itemId } }
      });
      if (existing) {
        res.status(400).json({ error: 'Posiadasz już ten samochód!' });
        return;
      }

      if (user.dollars < def.price) {
        res.status(400).json({ error: `Niewystarczające środki! Potrzebujesz $ ${def.price}` });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { dollars: { decrement: def.price } }
        }),
        prisma.userCar.create({
          data: { userId, carId: itemId }
        }),
        prisma.playerNeeds.update({
          where: { userId },
          data: { happiness: { increment: def.happinessBonus } } // Dodaje status zadowolenia!
        })
      ]);

      res.json({ message: `Kupiłeś luksusowy samochód: ${def.name}! Twoje zadowolenie wzrosło o +${def.happinessBonus}!` });
    } else {
      res.status(400).json({ error: 'Nieznany typ przedmiotu' });
    }
  } catch (err) {
    console.error('Buy investment error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/business/upgrade - Upgrade business level
router.post('/upgrade', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'Brakujący identyfikator biznesu' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const bus = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } }
    });

    if (!user || !bus) {
      res.status(404).json({ error: 'Biznes nie należy do Ciebie lub nie istnieje' });
      return;
    }

    const cost = getUpgradeCost(businessId, bus.level);
    if (user.dollars < cost) {
      res.status(400).json({ error: `Niewystarczające środki! Ulepszenie kosztuje $ ${cost}` });
      return;
    }

    // Najpierw nalicz zyski ze starym poziomem, zanim go zmienimy!
    await processPassiveIncome(userId);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { dollars: { decrement: cost } }
      }),
      prisma.userBusiness.update({
        where: { id: bus.id },
        data: { level: { increment: 1 } }
      })
    ]);

    res.json({ message: `Ulepszono biznes do poziomu ${bus.level + 1}!` });
  } catch (err) {
    console.error('Upgrade business error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/business/collect - Manually collect profits from unmanaged business
router.post('/collect', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'Brakujący identyfikator biznesu' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const bus = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } }
    });

    if (!user || !bus) {
      res.status(404).json({ error: 'Biznes nie istnieje' });
      return;
    }

    if (bus.hasManager) {
      res.status(400).json({ error: 'Ten biznes ma menedżera, zyski zbierają się automatycznie!' });
      return;
    }

    const now = new Date();
    const elapsedMs = now.getTime() - new Date(bus.lastCollectedAt).getTime();
    const elapsedMins = Math.min(1440, Math.floor(elapsedMs / 60000)); // limit 24h

    if (elapsedMins <= 0) {
      res.status(400).json({ error: 'Brak zgromadzonych zysków do odebrania (minął mniej niż 1 minuta).' });
      return;
    }

    const income = elapsedMins * getIncomePerMin(businessId, bus.level);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { dollars: { increment: income } }
      }),
      prisma.userBusiness.update({
        where: { id: bus.id },
        data: { lastCollectedAt: now }
      })
    ]);

    res.json({
      message: `Zebrano zysk $ ${income.toFixed(2)} USD!`,
      collectedAmount: income
    });
  } catch (err) {
    console.error('Collect profits error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/business/hire - Hire a manager to automate collection
router.post('/hire', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'Brakujący identyfikator biznesu' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const bus = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } }
    });

    if (!user || !bus) {
      res.status(404).json({ error: 'Biznes nie istnieje' });
      return;
    }

    if (bus.hasManager) {
      res.status(400).json({ error: 'Ten biznes ma już zatrudnionego menedżera!' });
      return;
    }

    const def = BUSINESSES_CATALOG[businessId];
    if (!def) {
      res.status(400).json({ error: 'Nieprawidłowy biznes' });
      return;
    }

    if (user.dollars < def.managerPrice) {
      res.status(400).json({ error: `Niewystarczające środki! Zatrudnienie menedżera kosztuje $ ${def.managerPrice}` });
      return;
    }

    // Zbierz ewentualne obecne zyski zanim włączymy menedżera
    await processPassiveIncome(userId);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { dollars: { decrement: def.managerPrice } }
      }),
      prisma.userBusiness.update({
        where: { id: bus.id },
        data: { hasManager: true, lastCollectedAt: new Date() }
      })
    ]);

    res.json({ message: `Zatrudniono menedżera dla: ${def.name}! Zyski zbierają się teraz w pełni automatycznie.` });
  } catch (err) {
    console.error('Hire manager error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
