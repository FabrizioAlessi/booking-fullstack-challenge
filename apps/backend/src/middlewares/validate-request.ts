import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationAppError } from '../errors/AppError.js';

type RequestSlice = 'body' | 'query' | 'params';

export function validateRequest<T>(schema: ZodSchema<T>, slice: RequestSlice = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[slice]);
    if (!parsed.success) {
      next(
        new ValidationAppError('Request validation failed', parsed.error.flatten()),
      );
      return;
    }
    // Keep validated/coerced data available to controllers.
    (req as Request & Record<RequestSlice, T>)[slice] = parsed.data;
    next();
  };
}
