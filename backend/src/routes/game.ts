import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import {
  startGame,
  hit,
  stand,
  doubleDown,
  getHandValue,
  isBlackjack,
} from '../services/blackjackService';
import { spin } from '../services/slotsService';
import { applyNeedsDecay } from '../services/needsService';

const router = Router();

router.use(authMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// BLACKJACK
// ────────────────────────────────────────────────────────────────────────────

// POST /api/game/blackjack/start
router.post('/blackjack/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bet } = req.body;

    if (!bet || typeof bet !== 'number' || bet <= 0) {
      res.status(400).json({ error: 'Nieprawidłowa stawka' });
      return;
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { tokens: true, dollars: true, playerNeeds: true } 
    });
    
    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    // Blokada gry jeśli którakolwiek z potrzeb wynosi 0
    if (user.playerNeeds) {
      const { sleep, hunger, hydration, happiness } = user.playerNeeds;
      if (sleep <= 0 || hunger <= 0 || hydration <= 0 || happiness <= 0) {
        res.status(400).json({ error: 'Jesteś zbyt wycieńczony lub smutny, aby grać! Zadbaj o swoje potrzeby.' });
        return;
      }
    }

    if (user.tokens < 0 || user.dollars < 0) {
      res.status(400).json({ error: 'Nie możesz grać z ujemnym stanem konta (długami)!' });
      return;
    }

    if (user.tokens < bet) {
      res.status(400).json({ error: 'Niewystarczające żetony' });
      return;
    }

    // Deduct bet upfront
    await prisma.user.update({ where: { id: userId }, data: { tokens: { decrement: bet } } });

    const session = startGame(userId, bet);
    session.happiness = user.playerNeeds?.happiness ?? 100;
    session.sleep = user.playerNeeds?.sleep ?? 100;

    res.json({
      gameId: userId,
      playerHand: session.playerHand,
      dealerVisible: session.dealerHand[0],
      playerValue: getHandValue(session.playerHand),
      isBlackjack: isBlackjack(session.playerHand),
      bet: session.bet,
    });
  } catch (err) {
    console.error('Blackjack start error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/blackjack/hit
router.post('/blackjack/hit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const session = hit(userId);
    if (!session) {
      res.status(404).json({ error: 'Brak aktywnej sesji gry' });
      return;
    }

    const playerValue = getHandValue(session.playerHand);
    const bust = playerValue > 21;

    if (bust) {
      // Player busts - game over, tokens already deducted
      const needs = await applyNeedsDecay(userId, 'solo');
      await prisma.playerStats.update({
        where: { userId },
        data: { gamesPlayed: { increment: 1 } },
      });
      await prisma.matchHistory.create({
        data: { player1Id: userId, gameType: 'blackjack_solo', tokensDelta: -session.bet },
      });

      res.json({
        playerHand: session.playerHand,
        dealerVisible: session.dealerHand[0],
        playerValue,
        bust: true,
        message: '💥 Przebicie! Przekroczyłeś 21.',
        needs,
      });
      return;
    }

    res.json({
      playerHand: session.playerHand,
      dealerVisible: session.dealerHand[0],
      playerValue,
      bust: false,
    });
  } catch (err) {
    console.error('Blackjack hit error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/blackjack/stand
router.post('/blackjack/stand', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = stand(userId);
    if (!result) {
      res.status(404).json({ error: 'Brak aktywnej sesji gry' });
      return;
    }

    const { session, outcome, payout } = result;

    // Apply payout
    if (payout > 0) {
      await prisma.user.update({ where: { id: userId }, data: { tokens: { increment: payout } } });
    }

    const tokensDelta = payout - session.bet;

    // Update stats
    const statsUpdate: Record<string, unknown> = { gamesPlayed: { increment: 1 } };
    if (outcome === 'win' || outcome === 'blackjack') {
      statsUpdate.blackjackWinsTotal = { increment: 1 };
    }

    await prisma.playerStats.update({ where: { userId }, data: statsUpdate });
    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'blackjack_solo', tokensDelta },
    });

    const needs = await applyNeedsDecay(userId, 'solo');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });

    res.json({
      playerHand: session.playerHand,
      dealerHand: session.dealerHand,
      playerValue: getHandValue(session.playerHand),
      dealerValue: getHandValue(session.dealerHand),
      outcome,
      payout,
      tokensDelta,
      tokens: user?.tokens ?? 0,
      needs,
      message: getOutcomeMessage(outcome),
    });
  } catch (err) {
    console.error('Blackjack stand error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/blackjack/double
router.post('/blackjack/double', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Check user has enough tokens for doubling
    const session = (await import('../services/blackjackService')).activeSessions.get(userId);
    if (!session) {
      res.status(404).json({ error: 'Brak aktywnej sesji gry' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });
    if (!user || user.tokens < session.bet) {
      res.status(400).json({ error: 'Niewystarczające żetony do podwojenia' });
      return;
    }

    // Deduct extra bet
    await prisma.user.update({ where: { id: userId }, data: { tokens: { decrement: session.bet } } });

    const result = doubleDown(userId);
    if (!result) {
      res.status(404).json({ error: 'Błąd podczas podwojenia' });
      return;
    }

    const { session: finalSession, outcome, payout } = result;

    if (payout > 0) {
      await prisma.user.update({ where: { id: userId }, data: { tokens: { increment: payout } } });
    }

    const tokensDelta = payout - finalSession.bet;

    const statsUpdate: Record<string, unknown> = { gamesPlayed: { increment: 1 } };
    if (outcome === 'win' || outcome === 'blackjack') {
      statsUpdate.blackjackWinsTotal = { increment: 1 };
    }

    await prisma.playerStats.update({ where: { userId }, data: statsUpdate });
    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'blackjack_solo_double', tokensDelta },
    });

    const needs = await applyNeedsDecay(userId, 'solo');
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true },
    });

    res.json({
      playerHand: finalSession.playerHand,
      dealerHand: finalSession.dealerHand,
      playerValue: getHandValue(finalSession.playerHand),
      dealerValue: getHandValue(finalSession.dealerHand),
      outcome,
      payout,
      tokensDelta,
      tokens: updatedUser?.tokens ?? 0,
      needs,
      message: getOutcomeMessage(outcome),
    });
  } catch (err) {
    console.error('Blackjack double error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// SLOTS
// ────────────────────────────────────────────────────────────────────────────

// POST /api/game/slots/spin
router.post('/slots/spin', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bet } = req.body;

    if (!bet || typeof bet !== 'number' || bet <= 0) {
      res.status(400).json({ error: 'Nieprawidłowa stawka' });
      return;
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { tokens: true, dollars: true, playerNeeds: true } 
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    // Blokada gry jeśli którakolwiek z potrzeb wynosi 0
    if (user.playerNeeds) {
      const { sleep, hunger, hydration, happiness } = user.playerNeeds;
      if (sleep <= 0 || hunger <= 0 || hydration <= 0 || happiness <= 0) {
        res.status(400).json({ error: 'Jesteś zbyt wycieńczony lub smutny, aby grać! Zadbaj o swoje potrzeby.' });
        return;
      }
    }

    if (user.tokens < 0 || user.dollars < 0) {
      res.status(400).json({ error: 'Nie możesz grać z ujemnym stanem konta (długami)!' });
      return;
    }

    if (user.tokens < bet) {
      res.status(400).json({ error: 'Niewystarczające żetony' });
      return;
    }

    const happinessValue = user.playerNeeds?.happiness ?? 100;
    const { reels, multiplier, isBonus } = spin(happinessValue);
    const winnings = Math.floor(bet * multiplier);
    const tokensDelta = winnings - bet;

    // Update tokens: subtract bet, add winnings
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { increment: tokensDelta } },
      select: { tokens: true },
    });

    const needs = await applyNeedsDecay(userId, 'solo');

    await prisma.playerStats.update({
      where: { userId },
      data: { gamesPlayed: { increment: 1 } },
    });

    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'slots_solo', tokensDelta },
    });

    res.json({
      reels,
      multiplier,
      isBonus,
      bet,
      winnings,
      tokensDelta,
      tokens: updatedUser.tokens,
      needs,
      message: multiplier > 0 ? `🎰 Wygrałeś! x${multiplier}` : '🎰 Brak wygranej. Spróbuj ponownie!',
    });
  } catch (err) {
    console.error('Slots spin error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/plock/spin - Płock Event 16-reel slots
router.post('/plock/spin', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bet } = req.body;

    if (!bet || typeof bet !== 'number' || bet < 50) {
      res.status(400).json({ error: 'Minimalna stawka na maszynie Płock wynosi 50 żetonów!' });
      return;
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { tokens: true, playerNeeds: true } 
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (user.playerNeeds) {
      const { sleep, hunger, hydration, happiness } = user.playerNeeds;
      if (sleep <= 0 || hunger <= 0 || hydration <= 0 || happiness <= 0) {
        res.status(400).json({ error: 'Jesteś zbyt wycieńczony lub smutny, aby grać! Zadbaj o swoje potrzeby.' });
        return;
      }
    }

    if (user.tokens < bet) {
      res.status(400).json({ error: 'Niewystarczające żetony na spin' });
      return;
    }

    const happinessValue = user.playerNeeds?.happiness ?? 100;
    const { spinPlock } = await import('../services/plockSlotsService');
    const { reels, multiplier, isBonus } = spinPlock(happinessValue);
    const winnings = Math.floor(bet * multiplier);
    const tokensDelta = winnings - bet;

    // Każdy spin daje 1 dymek Tindera (tinderHearts) i modyfikuje żetony
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        tokens: { increment: tokensDelta },
        tinderHearts: { increment: 1 }
      },
      select: { tokens: true, tinderHearts: true },
    });

    const needs = await applyNeedsDecay(userId, 'solo');

    await prisma.playerStats.update({
      where: { userId },
      data: { gamesPlayed: { increment: 1 } },
    });

    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'slots_plock', tokensDelta },
    });

    res.json({
      reels,
      multiplier,
      isBonus,
      bet,
      winnings,
      tokensDelta,
      tokens: updatedUser.tokens,
      tinderHearts: updatedUser.tinderHearts,
      needs,
      message: multiplier > 0 ? `🇵🇱 WYGRANA PŁOCK! x${multiplier}` : '😔 Brak wygranej w Płocku. Kręć dalej!',
    });
  } catch (err) {
    console.error('Plock slots spin error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/plock/claim - Claim rewards using Tinder hearts (dymki)
router.post('/plock/claim', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rewardId } = req.body; // 'silver_badge' | 'gold_badge' | '10k_tokens' | 'kawalerka'

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true, tinderHearts: true, playerHouse: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    let required = 0;
    if (rewardId === 'silver_badge') required = 50;
    else if (rewardId === 'gold_badge') required = 100;
    else if (rewardId === '10k_tokens') required = 200;
    else if (rewardId === 'willa') required = 800;
    else {
      res.status(400).json({ error: 'Nieznana nagroda' });
      return;
    }

    if (user.tinderHearts < required) {
      res.status(400).json({ error: `Niewystarczająca liczba dymków Tindera! Wymagane: ${required}, posiadasz: ${user.tinderHearts}` });
      return;
    }

    // Odejmij dymki z konta użytkownika i nadaj badge jeśli dotyczy
    await prisma.user.update({
      where: { id: userId },
      data: { 
        tinderHearts: { decrement: required },
        ...(rewardId === 'silver_badge' ? { tinderBadge: 'silver' } : {}),
        ...(rewardId === 'gold_badge' ? { tinderBadge: 'gold' } : {}),
      }
    });

    let message = '';
    if (rewardId === 'silver_badge') {
      message = '🎉 Odblokowałeś SREBRNĄ ikonę dymka przy profilu!';
    } else if (rewardId === 'gold_badge') {
      message = '🎉 Odblokowałeś ZŁOTĄ ikonę dymka przy profilu!';
    } else if (rewardId === '10k_tokens') {
      await prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: 10000 } }
      });
      message = '🎉 Otrzymałeś 10 000 żetonów!';
    } else if (rewardId === 'willa') {
      await prisma.playerHouse.upsert({
        where: { userId },
        update: { houseId: 4 },
        create: { userId, houseId: 4 }
      });
      message = '🎉 Otrzymałeś darmową Willę! Wszystkie udogodnienia odblokowane!';
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true, tinderHearts: true, playerHouse: true, tinderBadge: true }
    });

    res.json({
      message,
      tokens: updatedUser?.tokens ?? 0,
      tinderHearts: updatedUser?.tinderHearts ?? 0,
      playerHouse: updatedUser?.playerHouse,
      tinderBadge: updatedUser?.tinderBadge
    });
  } catch (err) {
    console.error('Claim reward error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

function getOutcomeMessage(outcome: string): string {
  switch (outcome) {
    case 'blackjack':
      return '🎉 BLACKJACK! Wygrałeś 3:2!';
    case 'win':
      return '✅ Wygrałeś! 1:1';
    case 'push':
      return '🤝 Remis! Stawka zwrócona.';
    case 'loss':
      return '❌ Przegrałeś. Powodzenia następnym razem!';
    default:
      return 'Gra zakończona.';
  }
}

// POST /api/game/race/bet - Wyścigi: 5 zawodniczek, 20% szans, wygrana x5 stawki
router.post('/race/bet', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bet, runner } = req.body; // runner to liczba od 1 do 5

    if (!bet || typeof bet !== 'number' || bet <= 0) {
      res.status(400).json({ error: 'Nieprawidłowa stawka' });
      return;
    }

    if (!runner || typeof runner !== 'number' || runner < 1 || runner > 5) {
      res.status(400).json({ error: 'Musisz wybrać zawodniczkę (1-5)' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true, playerNeeds: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (user.playerNeeds) {
      const { sleep, hunger, hydration, happiness } = user.playerNeeds;
      if (sleep <= 0 || hunger <= 0 || hydration <= 0 || happiness <= 0) {
        res.status(400).json({ error: 'Jesteś zbyt wycieńczony, by obstawiać! Zadbaj o potrzeby.' });
        return;
      }
    }

    if (user.tokens < bet) {
      res.status(400).json({ error: 'Niewystarczająca liczba żetonów' });
      return;
    }

    // Losowanie zwycięskiej zawodniczki (1-5, po 20% szans)
    const winningRunner = Math.floor(Math.random() * 5) + 1;
    const isWin = runner === winningRunner;

    const winnings = isWin ? bet * 5 : 0;
    const tokensDelta = winnings - bet;

    // Aktualizacja w bazie
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { increment: tokensDelta } },
      select: { tokens: true }
    });

    const needs = await applyNeedsDecay(userId, 'solo');

    await prisma.playerStats.update({
      where: { userId },
      data: { gamesPlayed: { increment: 1 } }
    });

    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'race_bet', tokensDelta }
    });

    res.json({
      winningRunner,
      isWin,
      winnings,
      tokensDelta,
      tokens: updatedUser.tokens,
      needs,
      message: isWin
        ? `🏁 WYGRANA! Zawodniczka ${winningRunner} dobiegła pierwsza! +${winnings} żetonów!`
        : `😔 PRZEGRANA. Wygrała zawodniczka ${winningRunner}.`
    });

  } catch (err) {
    console.error('Race game error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CRASH GAME
// ────────────────────────────────────────────────────────────────────────────
interface CrashSession {
  bet: number;
  crashMultiplier: number;
  active: boolean;
}

const crashSessions = new Map<string, CrashSession>();

// POST /api/game/crash/start
router.post('/crash/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bet } = req.body;

    if (!bet || typeof bet !== 'number' || bet <= 0) {
      res.status(400).json({ error: 'Nieprawidłowa stawka' });
      return;
    }

    // Atomowe potrącenie stawki
    const updated = await prisma.user.updateMany({
      where: { id: userId, tokens: { gte: bet } },
      data: { tokens: { decrement: bet } }
    });

    if (updated.count === 0) {
      res.status(400).json({ error: 'Niewystarczająca liczba żetonów' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { playerNeeds: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      return;
    }

    if (user.playerNeeds) {
      const { sleep, hunger, hydration, happiness } = user.playerNeeds;
      if (sleep <= 0 || hunger <= 0 || hydration <= 0 || happiness <= 0) {
        res.status(400).json({ error: 'Jesteś zbyt zmęczony, aby grać!' });
        return;
      }
    }

    // Losowanie momentu krachu (crashMultiplier)
    // Losowanie momentu krachu (custom probability distribution)
    const roll = Math.random();
    let crashMultiplier = 1.00;

    if (roll < 0.60) {
      // 60% szans: krach w przedziale [1.00, 2.00)
      crashMultiplier = parseFloat((1.00 + Math.random() * 1.00).toFixed(2));
    } else if (roll < 0.95) {
      // 35% szans: krach w przedziale [2.00, 3.00)
      crashMultiplier = parseFloat((2.00 + Math.random() * 1.00).toFixed(2));
    } else if (roll < 0.995) {
      // 4.5% szans: krach w przedziale [3.00, 5.00)
      crashMultiplier = parseFloat((3.00 + Math.random() * 2.00).toFixed(2));
    } else if (roll < 0.9995) {
      // 0.45% szans: krach w przedziale [5.00, 10.00)
      crashMultiplier = parseFloat((5.00 + Math.random() * 5.00).toFixed(2));
    } else {
      // 0.05% szans: krach w przedziale [10.00, 25.00]
      crashMultiplier = parseFloat((10.00 + Math.random() * 15.00).toFixed(2));
    }

    crashSessions.set(userId, { bet, crashMultiplier, active: true });

    res.json({
      success: true,
      message: 'Gra Crash rozpoczęta!',
      tokens: user.tokens
    });
  } catch (err) {
    console.error('Crash start error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/game/crash/cashout
router.post('/crash/cashout', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { multiplier } = req.body;

    if (!multiplier || typeof multiplier !== 'number' || multiplier < 1.00) {
      res.status(400).json({ error: 'Nieprawidłowy mnożnik wypłaty' });
      return;
    }

    const session = crashSessions.get(userId);
    if (!session || !session.active) {
      res.status(400).json({ error: 'Brak aktywnej sesji gry Crash' });
      return;
    }

    // Blokujemy podwójną wypłatę
    session.active = false;
    crashSessions.delete(userId);

    const isSuccess = multiplier <= session.crashMultiplier;

    let winnings = 0;
    let tokensDelta = -session.bet;

    if (isSuccess) {
      winnings = Math.floor(session.bet * multiplier);
      tokensDelta = winnings - session.bet;
    }

    // Dodanie wygranej
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { increment: winnings } },
      select: { tokens: true }
    });

    const needs = await applyNeedsDecay(userId, 'solo');

    await prisma.playerStats.update({
      where: { userId },
      data: { gamesPlayed: { increment: 1 } }
    });

    await prisma.matchHistory.create({
      data: { player1Id: userId, gameType: 'crash', tokensDelta }
    });

    res.json({
      success: true,
      won: isSuccess,
      multiplier,
      crashMultiplier: session.crashMultiplier,
      winnings,
      tokensDelta,
      tokens: updatedUser.tokens,
      needs,
      message: isSuccess
        ? `🚀 Sukces! Wypłaciłeś przy ${multiplier.toFixed(2)}x i wygrałeś ${winnings} żetonów!`
        : `💥 Crash! Gra wybuchła przy ${session.crashMultiplier.toFixed(2)}x.`
    });
  } catch (err) {
    console.error('Crash cashout error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

export default router;
