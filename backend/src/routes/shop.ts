import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ─── Czas psucia się jedzenia w plecaku: 5 minut ────────────────────────────
const BAG_SPOIL_MINUTES = 5;

// ─── Efekty przedmiotów ────────────────────────────────────────────────────
const ITEM_EFFECTS: Record<string, { sleep?: number; hunger?: number; hydration?: number }> = {
  woda:             { hydration: 50 },
  herbata:          { hydration: 70 },
  'kubuś water':    { hydration: 100 },
  chleb:            { hunger: 10 },
  kebab:            { hunger: 50 },
  'ptasie mleczko': { hunger: 100 },
};

// ─── Ceny bazowe (używane przy bulk discount) ─────────────────────────────
const BASE_PRICES: Record<string, number> = {
  woda: 5, herbata: 10, 'kubuś water': 50,
  chleb: 3, kebab: 25, 'ptasie mleczko': 35,
};

// ─── Cleanup przeterminowanych itemów w plecaku ───────────────────────────
async function cleanExpiredBagItems(userId: string): Promise<void> {
  const expireTime = new Date(Date.now() - BAG_SPOIL_MINUTES * 60 * 1000);
  await prisma.bagInventory.deleteMany({
    where: { userId, addedAt: { lt: expireTime } },
  });
}

// ─── GET /api/shop/houses ─────────────────────────────────────────────────
router.get('/houses', async (_req: Request, res: Response): Promise<void> => {
  try {
    const houses = await prisma.house.findMany({ orderBy: { price: 'asc' } });
    res.json({ houses });
  } catch (err) {
    console.error('Get houses error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/buy-house ─────────────────────────────────────────────
router.post('/buy-house', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { houseId } = req.body;

    if (!houseId || typeof houseId !== 'number') {
      res.status(400).json({ error: 'Nieprawidłowe houseId' });
      return;
    }

    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (!house) { res.status(404).json({ error: 'Dom nie istnieje' }); return; }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'Użytkownik nie znaleziony' }); return; }

    if (user.dollars < house.price) {
      res.status(400).json({ error: 'Niewystarczające dolary' });
      return;
    }

    const [updatedUser, updatedPlayerHouse] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { dollars: { decrement: house.price } },
        select: { dollars: true, tokens: true },
      }),
      prisma.playerHouse.update({
        where: { userId },
        data: { houseId, purchasedAt: new Date() },
        include: { house: true },
      }),
    ]);

    res.json({
      message: `Kupiono ${house.name} za $ ${house.price.toFixed(2)} USD`,
      dollars: updatedUser.dollars,
      tokens: updatedUser.tokens,
      playerHouse: updatedPlayerHouse,
    });
  } catch (err) {
    console.error('Buy house error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/buy-bag ───────────────────────────────────────────────
router.post('/buy-bag', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'Użytkownik nie znaleziony' }); return; }
    if (user.hasBag) { res.status(400).json({ error: 'Posiadasz już plecak' }); return; }
    if (user.dollars < 30) { res.status(400).json({ error: 'Potrzebujesz $ 30.00, aby kupić plecak' }); return; }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { dollars: { decrement: 30 }, hasBag: true },
    });

    res.json({ message: 'Kupiono plecak!', dollars: updatedUser.dollars, tokens: updatedUser.tokens, hasBag: updatedUser.hasBag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/buy-item ──────────────────────────────────────────────
// Obsługuje bulk discount: ilość >= 5 → -40%
router.post('/buy-item', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { itemName, quantity: rawQty, toBag } = req.body;
    const quantity = Math.max(1, parseInt(rawQty) || 1);

    if (!itemName) {
      res.status(400).json({ error: 'Nieprawidłowe dane przedmiotu' });
      return;
    }

    const basePrice = BASE_PRICES[itemName.toLowerCase()] ?? 10;
    const discount = quantity >= 5 ? 0.6 : 1;           // 40% taniej
    const pricePerUnit = Math.round(basePrice * discount);
    const totalPrice = pricePerUnit * quantity;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { playerHouse: { include: { house: true } } }
    });

    if (!user) { res.status(404).json({ error: 'Użytkownik nie znaleziony' }); return; }
    if (user.dollars < totalPrice) {
      res.status(400).json({ error: `Niewystarczające dolary (potrzebujesz $ ${totalPrice})` });
      return;
    }

    if (toBag) {
      if (!user.hasBag) {
        res.status(400).json({ error: 'Musisz kupić plecak, aby chować do niego rzeczy!' });
        return;
      }

      // Sprawdź miejsce w plecaku (maks 5)
      const bagItems = await prisma.bagInventory.findMany({ where: { userId } });
      const existingItem = bagItems.find(b => b.itemName === itemName);
      const existingQty = existingItem?.quantity ?? 0;
      const bagTotal = bagItems.reduce((s, b) => s + b.quantity, 0);

      if (bagTotal + quantity > 5) {
        res.status(400).json({ error: `Plecak pomieści tylko ${5 - bagTotal} więcej sztuk (maks. 5)` });
        return;
      }

      await prisma.user.update({ where: { id: userId }, data: { dollars: { decrement: totalPrice } } });

      if (existingItem) {
        // Aktualizuj czas i ilość
        await prisma.bagInventory.update({
          where: { userId_itemName: { userId, itemName } },
          data: { quantity: existingQty + quantity, addedAt: new Date() },
        });
      } else {
        await prisma.bagInventory.create({ data: { userId, itemName, quantity, addedAt: new Date() } });
      }

      // Wyczyść przeterminowane
      await cleanExpiredBagItems(userId);
      const updatedBag = await prisma.bagInventory.findMany({ where: { userId } });
      const updatedUser = await prisma.user.findUnique({ where: { id: userId }, select: { dollars: true, tokens: true } });

      res.json({
        message: `Schowano ${quantity}x ${itemName} do plecaka${quantity >= 5 ? ' (Promocja -40%!)' : ''}`,
        dollars: updatedUser!.dollars,
        tokens: updatedUser!.tokens,
        bagInventory: updatedBag,
        pricePerUnit,
        totalPrice,
        discount: quantity >= 5,
      });
      return;
    }

    // Do lodówki
    if (!user.playerHouse?.house.hasFridge) {
      res.status(400).json({ error: 'Potrzebujesz lodówki (Kawalerkę+) aby kupować jedzenie do domu!' });
      return;
    }

    await prisma.user.update({ where: { id: userId }, data: { dollars: { decrement: totalPrice } } });
    await prisma.inventory.upsert({
      where: { userId_itemName: { userId, itemName } },
      create: { userId, itemName, quantity },
      update: { quantity: { increment: quantity } },
    });

    const updatedFridge = await prisma.inventory.findMany({ where: { userId } });
    const updatedUser = await prisma.user.findUnique({ where: { id: userId }, select: { dollars: true, tokens: true } });

    res.json({
      message: `Kupiono ${quantity}x ${itemName} do lodówki${quantity >= 5 ? ' (Promocja -40%!)' : ''}`,
      dollars: updatedUser!.dollars,
      tokens: updatedUser!.tokens,
      inventory: updatedFridge,
      pricePerUnit,
      totalPrice,
      discount: quantity >= 5,
    });
  } catch (err) {
    console.error('Buy item error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── GET /api/shop/bag ────────────────────────────────────────────────────
// Zwraca plecak + czyści przeterminowane
router.get('/bag', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await cleanExpiredBagItems(userId);
    const bag = await prisma.bagInventory.findMany({ where: { userId }, orderBy: { addedAt: 'desc' } });
    res.json({ bagInventory: bag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/sleep ─────────────────────────────────────────────────
router.post('/sleep', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const playerHouse = await prisma.playerHouse.findUnique({
      where: { userId },
      include: { house: true },
    });

    if (!playerHouse) { res.status(404).json({ error: 'Brak przypisanego domu' }); return; }

    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    if (!needs) { res.status(404).json({ error: 'Brak danych potrzeb gracza' }); return; }

    const sleepBonus = playerHouse.house.sleepBonus;
    const newSleep = Math.min(100, needs.sleep + sleepBonus);

    const updatedNeeds = await prisma.playerNeeds.update({
      where: { userId },
      data: { sleep: newSleep },
    });

    res.json({ message: `Odpocząłeś. Energia snu +${sleepBonus.toFixed(0)}`, needs: updatedNeeds });
  } catch (err) {
    console.error('Sleep error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/drink-tap ─────────────────────────────────────────────
router.post('/drink-tap', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const playerHouse = await prisma.playerHouse.findUnique({
      where: { userId },
      include: { house: true },
    });

    if (!playerHouse?.house.hasTap) {
      res.status(400).json({ error: 'Twój dom nie ma kranu. Kup Mieszkanie lub Willę!' });
      return;
    }

    const updatedNeeds = await prisma.playerNeeds.update({
      where: { userId },
      data: { hydration: 100 },
    });

    res.json({ message: 'Napiłeś się wody z kranu. Nawodnienie: 100%', needs: updatedNeeds });
  } catch (err) {
    console.error('Drink tap error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/free-food ─────────────────────────────────────────────
// Tylko Willa – darmowe jedzenie (+60 głodu)
router.post('/free-food', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const playerHouse = await prisma.playerHouse.findUnique({
      where: { userId },
      include: { house: true },
    });

    if (!playerHouse?.house.freeFood) {
      res.status(400).json({ error: 'Darmowe jedzenie dostępne tylko w Willi!' });
      return;
    }

    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    if (!needs) { res.status(404).json({ error: 'Brak potrzeb gracza' }); return; }

    const updatedNeeds = await prisma.playerNeeds.update({
      where: { userId },
      data: { hunger: Math.min(100, needs.hunger + 60) },
    });

    res.json({ message: 'Zjadłeś darmowy posiłek z Willi. +60 Najedzenia!', needs: updatedNeeds });
  } catch (err) {
    console.error('Free food error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/consume ───────────────────────────────────────────────
router.post('/consume', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { itemName, fromBag } = req.body;

    if (!itemName) { res.status(400).json({ error: 'itemName jest wymagany' }); return; }

    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    if (!needs) { res.status(404).json({ error: 'Brak danych potrzeb gracza' }); return; }

    const effects = ITEM_EFFECTS[itemName.toLowerCase()] || { hunger: 15 };
    const updateData: Partial<{ sleep: number; hunger: number; hydration: number }> = {};
    if (effects.sleep !== undefined) updateData.sleep = Math.min(100, Math.max(0, needs.sleep + effects.sleep));
    if (effects.hunger !== undefined) updateData.hunger = Math.min(100, Math.max(0, needs.hunger + effects.hunger));
    if (effects.hydration !== undefined) updateData.hydration = Math.min(100, Math.max(0, needs.hydration + effects.hydration));

    if (fromBag) {
      await cleanExpiredBagItems(userId);
      const bagItem = await prisma.bagInventory.findUnique({
        where: { userId_itemName: { userId, itemName } },
      });
      if (!bagItem || bagItem.quantity <= 0) {
        res.status(400).json({ error: 'Nie masz tego przedmiotu w plecaku (lub wygasł!)' });
        return;
      }

      const [updatedNeeds] = await prisma.$transaction([
        prisma.playerNeeds.update({ where: { userId }, data: updateData }),
        bagItem.quantity <= 1
          ? prisma.bagInventory.delete({ where: { userId_itemName: { userId, itemName } } })
          : prisma.bagInventory.update({ where: { userId_itemName: { userId, itemName } }, data: { quantity: { decrement: 1 } } }),
      ]);

      const updatedBag = await prisma.bagInventory.findMany({ where: { userId } });
      res.json({ message: `Spożyłeś ${itemName} z plecaka`, needs: updatedNeeds, bagInventory: updatedBag });
      return;
    }

    // Z lodówki
    const inventoryItem = await prisma.inventory.findUnique({
      where: { userId_itemName: { userId, itemName } },
    });
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      res.status(400).json({ error: 'Nie masz tego przedmiotu w lodówce' });
      return;
    }

    const [updatedNeeds] = await prisma.$transaction([
      prisma.playerNeeds.update({ where: { userId }, data: updateData }),
      inventoryItem.quantity <= 1
        ? prisma.inventory.delete({ where: { userId_itemName: { userId, itemName } } })
        : prisma.inventory.update({ where: { userId_itemName: { userId, itemName } }, data: { quantity: { decrement: 1 } } }),
    ]);

    const updatedFridge = await prisma.inventory.findMany({ where: { userId } });
    res.json({ message: `Spożyłeś ${itemName} z lodówki`, needs: updatedNeeds, inventory: updatedFridge });
  } catch (err) {
    console.error('Consume error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ─── POST /api/shop/entertainment ────────────────────────────────────────
router.post('/entertainment', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { activity } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const needs = await prisma.playerNeeds.findUnique({ where: { userId } });
    if (!user || !needs) { res.status(404).json({ error: 'Użytkownik nie znaleziony' }); return; }

    let cost = 0;
    let deltaHappiness = 0;
    let deltaHunger = 0;
    let deltaHydration = 0;
    let outcomeMessage = '';
    let event = 'success';

    if (activity === 'walenie_konia') {
      cost = 0; deltaHappiness = 5;
      outcomeMessage = 'Zrobiłeś to. Humor odrobinę lepszy...';
    } else if (activity === 'kino') {
      cost = 30; deltaHappiness = 30;
      outcomeMessage = 'Obejrzałeś dobry film o mafii. Zadowolenie wzrosło!';
    } else if (activity === 'randka') {
      cost = 120; deltaHappiness = 50; deltaHunger = 50; deltaHydration = 50;
      outcomeMessage = 'Udana randka z Tindera! Pojadłeś, popiłeś i humor o wiele lepszy.';
    } else if (activity === 'stripclub') {
      cost = 150; deltaHappiness = 100; deltaHydration = 100;
      outcomeMessage = 'Wspaniała noc w klubie nocnym!';
    } else {
      res.status(400).json({ error: 'Nieznana rozrywka' }); return;
    }

    // Sprawdzenie bazowego kosztu przed ewentualnymi wypadkami losowymi (w dolarach)
    if (user.dollars < cost) {
      res.status(400).json({ error: `Potrzebujesz ${cost} $ na tę rozrywkę!` }); return;
    }

    // Wypadki losowe
    if (activity === 'stripclub') {
      if (Math.random() < 0.20) {
        cost += 250; event = 'accident';
        outcomeMessage += ' ⚠️ UPS! Dziewczyna z klubu zaszła w ciążę. Musiałeś zapłacić 250 $ za aborcję!';
      }
    } else if (activity === 'walenie_konia') {
      if (Math.random() < 0.01) {
        cost += 2500; event = 'accident';
        outcomeMessage = ' ⚠️ O CHOLERA! Zerwałeś wędzidełko podczas masturbacji! Trafiłeś do szpitala. Koszt leczenia to 2500 $!';
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId }, data: { dollars: { decrement: cost } },
    });
    const updatedNeeds = await prisma.playerNeeds.update({
      where: { userId },
      data: {
        happiness: Math.min(100, needs.happiness + deltaHappiness),
        hunger: Math.min(100, needs.hunger + deltaHunger),
        hydration: Math.min(100, needs.hydration + deltaHydration),
      },
    });

    res.json({ message: outcomeMessage, event, dollars: updatedUser.dollars, tokens: updatedUser.tokens, needs: updatedNeeds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
