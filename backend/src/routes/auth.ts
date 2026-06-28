import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function generateToken(id: string, email: string, nickname: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ id, email, nickname }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, nickname, password } = req.body;

    if (!email || !nickname || !password) {
      res.status(400).json({ error: 'Email, nickname i hasło są wymagane' });
      return;
    }

    if (typeof nickname !== 'string' || nickname.length > 10) {
      res.status(400).json({ error: 'Nickname może mieć maksymalnie 10 znaków' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Nieprawidłowy format email' });
      return;
    }

    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
      } else {
        res.status(400).json({ error: 'Ten nickname jest już zajęty' });
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, nickname, passwordHash, tokens: 0 },
      });

      await tx.playerNeeds.create({ data: { userId: newUser.id } });
      await tx.playerStats.create({ data: { userId: newUser.id } });
      await tx.playerHouse.create({ data: { userId: newUser.id, houseId: 1 } });

      return newUser;
    });

    const token = generateToken(user.id, user.email, user.nickname);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        tokens: user.tokens,
        skinColor: user.skinColor,
        hairStyle: user.hairStyle,
        characterCreated: user.characterCreated,
        hasBag: user.hasBag,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email i hasło są wymagane' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        playerNeeds: true,
        playerStats: true,
        playerHouse: { include: { house: true } },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
      return;
    }

    const token = generateToken(user.id, user.email, user.nickname);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        tokens: user.tokens,
        skinColor: user.skinColor,
        hairStyle: user.hairStyle,
        characterCreated: user.characterCreated,
        hasBag: user.hasBag,
        createdAt: user.createdAt,
      },
      needs: user.playerNeeds,
      stats: user.playerStats,
      playerHouse: user.playerHouse,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// POST /api/auth/character
router.post(
  '/character',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { skinColor, hairStyle } = req.body;

      if (!skinColor || !hairStyle) {
        res.status(400).json({ error: 'skinColor i hairStyle są wymagane' });
        return;
      }

      const validSkinColors = ['light', 'medium', 'dark', 'olive', 'tan', 'deep'];
      const validHairStyles = ['short', 'long', 'curly', 'bald', 'mohawk'];

      if (!validSkinColors.includes(skinColor)) {
        res.status(400).json({ error: 'Nieprawidłowy kolor skóry' });
        return;
      }

      if (!validHairStyles.includes(hairStyle)) {
        res.status(400).json({ error: 'Nieprawidłowy styl włosów' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { skinColor, hairStyle, characterCreated: true },
        select: {
          id: true,
          email: true,
          nickname: true,
          tokens: true,
          skinColor: true,
          hairStyle: true,
          characterCreated: true,
          hasBag: true,
        },
      });

      res.json({ user: updatedUser });
    } catch (err) {
      console.error('Character error:', err);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Przetwarzaj pasywny przychód
      const { processPassiveIncome } = await import('../services/businessService');
      await processPassiveIncome(userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          playerNeeds: true,
          playerStats: true,
          playerHouse: { include: { house: true } },
          inventory: true,
          bagInventory: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        return;
      }

      const { passwordHash: _ph, ...safeUser } = user;

      res.json({ user: safeUser });
    } catch (err) {
      console.error('Me error:', err);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
);

export default router;
