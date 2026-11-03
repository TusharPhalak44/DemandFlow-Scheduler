import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

export interface AuthRequest extends Request {
  admin?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized. Authentication token is missing.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'meeting_calendar_secret_jwt_key_2026_super_secure';

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      role: string;
    };

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: 'Unauthorized. Admin account is invalid or inactive.' });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
};
