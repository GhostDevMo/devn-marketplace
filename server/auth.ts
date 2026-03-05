
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser & { role?: string };
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  // Get full user data from storage
  try {
    const fullUser = await storage.getUserById(user.id);
    if (!fullUser) {
      return res.status(403).json({ message: 'User not found' });
    }
    req.user = {
      id: fullUser.id,
      email: fullUser.email || '',
      firstName: fullUser.firstName || '',
      lastName: fullUser.lastName || '',
      profileImageUrl: fullUser.profileImageUrl || undefined,
      role: fullUser.role || 'client',
    };
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const user = verifyToken(token);
    if (user) {
      try {
        const fullUser = await storage.getUserById(user.id);
        if (fullUser) {
          req.user = {
            id: fullUser.id,
            email: fullUser.email || '',
            firstName: fullUser.firstName || '',
            lastName: fullUser.lastName || '',
            profileImageUrl: fullUser.profileImageUrl || undefined,
          };
        }
      } catch (error) {
        // Silent fail for optional auth
      }
    }
  }

  next();
};
