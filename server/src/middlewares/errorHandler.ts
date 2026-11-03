import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled Application Error:', err);

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // 2. Custom Slot Double-Booking Error
  if (err.code === 'SLOT_ALREADY_BOOKED') {
    res.status(409).json({
      error: 'Conflict: Slot unavailable',
      message: err.message || 'This slot was just booked by another agent. Please pick another time.',
    });
    return;
  }

  // 3. Prisma Unique Constraint Violation (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || [];
    res.status(409).json({
      error: 'Duplicate entry conflict',
      message: `A conflict occurred on field(s): ${target.join(', ')}. Another user may have just booked this slot.`,
    });
    return;
  }

  // 4. Generic handled messages
  const statusCode = err.statusCode || (err.message && err.message.includes('not found') ? 404 : 500);
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.',
  });
}
