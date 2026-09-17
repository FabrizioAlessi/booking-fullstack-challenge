import { Router } from 'express';
import { validateRequest } from '../../middlewares/validate-request.js';
import { bookingController } from './booking.controller.js';
import {
  bookingIdParamsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingSchema,
} from './booking.validation.js';

export const bookingRoutes = Router();

bookingRoutes.get(
  '/',
  validateRequest(listBookingsQuerySchema, 'query'),
  bookingController.list,
);

bookingRoutes.get(
  '/:id',
  validateRequest(bookingIdParamsSchema, 'params'),
  bookingController.getById,
);

bookingRoutes.post(
  '/',
  validateRequest(createBookingSchema, 'body'),
  bookingController.create,
);

bookingRoutes.put(
  '/:id',
  validateRequest(bookingIdParamsSchema, 'params'),
  validateRequest(updateBookingSchema, 'body'),
  bookingController.update,
);

bookingRoutes.delete(
  '/:id',
  validateRequest(bookingIdParamsSchema, 'params'),
  bookingController.remove,
);
