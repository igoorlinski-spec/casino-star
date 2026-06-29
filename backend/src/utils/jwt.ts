import jwt from 'jsonwebtoken';
import { JwtPayload } from '../middleware/auth';

export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not configured');
    return null;
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (err) {
    console.error('Invalid token', err);
    return null;
  }
}
