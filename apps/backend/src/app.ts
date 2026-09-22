import cors from 'cors';
import express from 'express';
import { bookingRoutes } from './modules/bookings/booking.routes.js';
import { slotLockRoutes } from './modules/slot-locks/slot-lock.routes.js';
import { eventsHandler } from './realtime/events.controller.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
      },
    });
  });

  app.get('/api/events', eventsHandler);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/slot-locks', slotLockRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
