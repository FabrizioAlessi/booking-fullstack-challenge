import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { BookingModel } from '../src/modules/bookings/booking.model.js';

describe('Bookings API', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await BookingModel.syncIndexes();
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

  it('exposes unique compound index uniq_booking_date_time_slot', async () => {
    const indexes = await BookingModel.collection.indexes();
    const uniqueIndex = indexes.find((index) => index.name === 'uniq_booking_date_time_slot');

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex?.unique).toBe(true);
    expect(uniqueIndex?.key).toEqual({ date: 1, time_slot: 1 });
  });

  it('POST /api/bookings creates a booking and returns 201', async () => {
    const payload = {
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
      note: 'Prima visita',
    };

    const response = await request(app).post('/api/bookings').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject(payload);
    expect(response.body.data.id).toBeTruthy();

    const stored = await BookingModel.findById(response.body.data.id).lean();
    expect(stored).toMatchObject(payload);
  });

  it('POST /api/bookings returns 409 BOOKING_SLOT_CONFLICT on duplicate slot', async () => {
    const payload = {
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
    };

    const first = await request(app).post('/api/bookings').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/bookings').send({
      ...payload,
      name: 'Luigi Bianchi',
    });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('BOOKING_SLOT_CONFLICT');
    expect(second.body.error.message).toBe('The selected time slot is already booked');
  });

  it('allows the same time_slot on different dates', async () => {
    const first = await request(app).post('/api/bookings').send({
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
    });
    const second = await request(app).post('/api/bookings').send({
      name: 'Luigi Bianchi',
      date: '2026-09-21',
      time_slot: '10:00',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it('allows different time_slot on the same date', async () => {
    const first = await request(app).post('/api/bookings').send({
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
    });
    const second = await request(app).post('/api/bookings').send({
      name: 'Luigi Bianchi',
      date: '2026-09-20',
      time_slot: '10:30',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it('rejects concurrent duplicate inserts with exactly one 201 and one 409', async () => {
    const payload = {
      name: 'Concurrent User',
      date: '2026-09-22',
      time_slot: '11:00',
    };

    const [first, second] = await Promise.all([
      request(app).post('/api/bookings').send({ ...payload, name: 'A' }),
      request(app).post('/api/bookings').send({ ...payload, name: 'B' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = first.status === 201 ? first : second;
    const loser = first.status === 409 ? first : second;
    expect(winner.body.data.time_slot).toBe('11:00');
    expect(loser.body.error.code).toBe('BOOKING_SLOT_CONFLICT');

    const count = await BookingModel.countDocuments({
      date: payload.date,
      time_slot: payload.time_slot,
    });
    expect(count).toBe(1);
  });

  it('returns 400 VALIDATION_ERROR for malformed payloads', async () => {
    const response = await request(app).post('/api/bookings').send({
      name: '',
      date: '20-09-2026',
      time_slot: '10',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Request validation failed');
  });

  it('lists bookings for a date ordered by time_slot', async () => {
    await request(app).post('/api/bookings').send({
      name: 'B',
      date: '2026-09-20',
      time_slot: '11:00',
    });
    await request(app).post('/api/bookings').send({
      name: 'A',
      date: '2026-09-20',
      time_slot: '09:00',
    });

    const response = await request(app).get('/api/bookings').query({ date: '2026-09-20' });

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { time_slot: string }) => item.time_slot)).toEqual([
      '09:00',
      '11:00',
    ]);
  });

  it('DELETE /api/bookings/:id returns 204 and frees the slot', async () => {
    const created = await request(app).post('/api/bookings').send({
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
    });
    expect(created.status).toBe(201);

    const deleted = await request(app).delete(`/api/bookings/${created.body.data.id}`);
    expect(deleted.status).toBe(204);

    const list = await request(app).get('/api/bookings').query({ date: '2026-09-20' });
    expect(list.body.data).toEqual([]);

    const recreated = await request(app).post('/api/bookings').send({
      name: 'Luigi Bianchi',
      date: '2026-09-20',
      time_slot: '10:00',
    });
    expect(recreated.status).toBe(201);
  });

  it('GET /api/bookings/:id returns 404 BOOKING_NOT_FOUND for unknown id', async () => {
    const response = await request(app).get('/api/bookings/64b64c4f2f1c2e0012345678');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('PUT /api/bookings/:id updates a booking and respects unique index', async () => {
    const first = await request(app).post('/api/bookings').send({
      name: 'Mario Rossi',
      date: '2026-09-20',
      time_slot: '10:00',
    });
    const second = await request(app).post('/api/bookings').send({
      name: 'Luigi Bianchi',
      date: '2026-09-20',
      time_slot: '10:30',
    });

    const conflict = await request(app)
      .put(`/api/bookings/${second.body.data.id}`)
      .send({ time_slot: '10:00' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('BOOKING_SLOT_CONFLICT');

    const updated = await request(app)
      .put(`/api/bookings/${first.body.data.id}`)
      .send({ note: 'Aggiornata' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.note).toBe('Aggiornata');
  });
});
