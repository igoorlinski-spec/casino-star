// ─────────────────────────────────────────────────────────────────────────────
// Giełda – routes
// GET  /api/stocks          → lista spółek + portfel gracza
// POST /api/stocks/buy      → kup akcje (płaci tokenami)
// POST /api/stocks/sell     → sprzedaj akcje (dostaje tokeny)
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { verifyToken } from '../utils/jwt';
import { STOCKS } from '../services/stockService';

const router = Router();

// Middleware: wyciąga userId z tokenu
function auth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'Brak tokenu' }); return null; }
  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Nieprawidłowy token' }); return null; }
  return (payload as any).userId;
}

// ── GET /api/stocks ───────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = auth(req, res);
  if (!userId) return;

  const [stocks, holdings] = await Promise.all([
    prisma.stock.findMany({ orderBy: { id: 'asc' } }),
    prisma.stockHolding.findMany({ where: { userId } }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });

  // Wzbogać każdą spółkę o dane portfelowe gracza
  const enriched = stocks.map(s => {
    const holding = holdings.find(h => h.stockId === s.id);
    const changeVsInitial = ((s.price - s.initialPrice) / s.initialPrice) * 100;
    return {
      ...s,
      changeVsInitial: Math.round(changeVsInitial * 100) / 100,
      holding: holding
        ? {
            shares: holding.shares,
            avgBuyPrice: holding.avgBuyPrice,
            currentValue: Math.round(holding.shares * s.price * 100) / 100,
            profitLoss: Math.round((s.price - holding.avgBuyPrice) * holding.shares * 100) / 100,
            profitLossPct: Math.round(((s.price - holding.avgBuyPrice) / holding.avgBuyPrice) * 10000) / 100,
          }
        : null,
    };
  });

  res.json({ stocks: enriched, tokens: user?.tokens ?? 0 });
});

// ── POST /api/stocks/buy ──────────────────────────────────────────────────────
router.post('/buy', async (req: Request, res: Response): Promise<void> => {
  const userId = auth(req, res);
  if (!userId) return;

  const { stockId, tokenAmount } = req.body as { stockId: string; tokenAmount: number };
  if (!stockId || !tokenAmount || tokenAmount <= 0) {
    res.status(400).json({ error: 'Podaj stockId i tokenAmount > 0' });
    return;
  }

  const [stock, user] = await Promise.all([
    prisma.stock.findUnique({ where: { id: stockId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } }),
  ]);

  if (!stock) { res.status(404).json({ error: 'Nie znaleziono spółki' }); return; }
  if (!user) { res.status(404).json({ error: 'Nie znaleziono gracza' }); return; }
  if (user.tokens < tokenAmount) { res.status(400).json({ error: 'Nie masz tyle żetonów' }); return; }

  const sharesBought = tokenAmount / stock.price;
  const existing = await prisma.stockHolding.findUnique({ where: { userId_stockId: { userId, stockId } } });

  if (existing) {
    const newShares = existing.shares + sharesBought;
    const newAvg = (existing.avgBuyPrice * existing.shares + stock.price * sharesBought) / newShares;
    await prisma.stockHolding.update({
      where: { userId_stockId: { userId, stockId } },
      data: { shares: newShares, avgBuyPrice: newAvg, boughtAt: new Date() }, // reset timera przy dokupowaniu
    });
  } else {
    await prisma.stockHolding.create({
      data: { userId, stockId, shares: sharesBought, avgBuyPrice: stock.price, boughtAt: new Date() },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { tokens: { decrement: tokenAmount } },
    select: { tokens: true },
  });

  res.json({
    message: `Kupiono ${sharesBought.toFixed(4)} akcji ${stock.name} za ${tokenAmount} 🪙`,
    tokens: updatedUser.tokens,
  });
});

// ── POST /api/stocks/sell ─────────────────────────────────────────────────────
router.post('/sell', async (req: Request, res: Response): Promise<void> => {
  const userId = auth(req, res);
  if (!userId) return;

  const { stockId, sharesToSell } = req.body as { stockId: string; sharesToSell: number };
  if (!stockId || !sharesToSell || sharesToSell <= 0) {
    res.status(400).json({ error: 'Podaj stockId i sharesToSell > 0' });
    return;
  }

  const [stock, holding] = await Promise.all([
    prisma.stock.findUnique({ where: { id: stockId } }),
    prisma.stockHolding.findUnique({ where: { userId_stockId: { userId, stockId } } }),
  ]);

  if (!stock) { res.status(404).json({ error: 'Nie znaleziono spółki' }); return; }
  if (!holding || holding.shares < sharesToSell) {
    res.status(400).json({ error: 'Nie masz tylu akcji' }); return;
  }

  const tokensEarned = Math.floor(sharesToSell * stock.price);
  const newShares = holding.shares - sharesToSell;

  if (newShares < 0.00001) {
    await prisma.stockHolding.delete({ where: { userId_stockId: { userId, stockId } } });
  } else {
    await prisma.stockHolding.update({
      where: { userId_stockId: { userId, stockId } },
      data: { shares: newShares },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { tokens: { increment: tokensEarned } },
    select: { tokens: true },
  });

  res.json({
    message: `Sprzedano ${sharesToSell.toFixed(4)} akcji ${stock.name} za ${tokensEarned} 🪙`,
    tokens: updatedUser.tokens,
  });
});

export default router;
