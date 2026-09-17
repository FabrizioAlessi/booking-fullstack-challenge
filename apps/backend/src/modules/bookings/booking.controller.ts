import type { NextFunction, Request, Response } from 'express';
import { bookingService, type BookingService } from './booking.service.js';
import type { CreateBookingDto, UpdateBookingDto } from './booking.validation.js';

export class BookingController {
  constructor(private readonly service: BookingService = bookingService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as CreateBookingDto;
      const data = await this.service.create(body);
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

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getById(req.params.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as UpdateBookingDto;
      const data = await this.service.update(req.params.id, body);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const bookingController = new BookingController();
