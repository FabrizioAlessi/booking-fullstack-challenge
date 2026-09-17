import cors from 'cors';
import express from 'express';
import { bookingRoutes } from './modules/bookings/booking.routes.js';
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

  app.use('/api/bookings', bookingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
