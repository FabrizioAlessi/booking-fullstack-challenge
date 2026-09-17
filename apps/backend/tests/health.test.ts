import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { BookingModel } from '../src/modules/bookings/booking.model.js';

describe('API skeleton', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await BookingModel.init();
  });

  afterEach(async () => {
    await BookingModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('GET /api/health returns 200', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { status: 'ok' },
    });
  });

  it('POST /api/bookings returns 409 BOOKING_SLOT_CONFLICT on duplicate slot', async () => {
    const payload = {
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
      note: 'Prima visita',
    };

    const first = await request(app).post('/api/bookings').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/bookings').send({
      ...payload,
      name: 'Luigi Bianchi',
    });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error: {
        code: 'BOOKING_SLOT_CONFLICT',
        message: 'The selected time slot is already booked',
        details: {
          keyValue: {
            date: '2026-09-20',
            time_slot: '10:00',
          },
        },
      },
    });
  });

  it('exposes unique compound index uniq_booking_date_time_slot', async () => {
    const indexes = await BookingModel.collection.indexes();
    const uniqueIndex = indexes.find((index) => index.name === 'uniq_booking_date_time_slot');

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex?.unique).toBe(true);
    expect(uniqueIndex?.key).toEqual({ date: 1, time_slot: 1 });
  });
});
