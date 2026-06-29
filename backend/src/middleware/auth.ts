import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  nickname: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const lastRequestTime = new Map<string, number>();

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Anty-clicker / Cooldown limit (500ms) - tylko dla POST, PUT, DELETE
    if (req.method !== 'GET') {
      const userId = decoded.id;
      const now = Date.now();
      const lastTime = lastRequestTime.get(userId);

      if (lastTime && now - lastTime < 500) {
        res.status(429).json({
          error: '⚠️ Anty-clicker: Wysyłasz zapytania zbyt szybko! Odczekaj chwilę.'
        });
        return;
      }
      lastRequestTime.set(userId, now);
    }

    req.user = { id: decoded.id, email: decoded.email, nickname: decoded.nickname };
    next();
  } catch {
    res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }
}
