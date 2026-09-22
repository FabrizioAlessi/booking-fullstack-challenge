import type { NextFunction, Request, Response } from 'express';
import { slotLockService, type SlotLockService } from './slot-lock.service.js';
import type { AcquireSlotLockDto } from './slot-lock.validation.js';

export class SlotLockController {
  constructor(private readonly service: SlotLockService = slotLockService) {}

  acquire = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as AcquireSlotLockDto;
      const data = await this.service.acquire(body);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = String(req.query.date);
      const data = await this.service.listByDate(date);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };

  release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.release(req.params.lockId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const slotLockController = new SlotLockController();
