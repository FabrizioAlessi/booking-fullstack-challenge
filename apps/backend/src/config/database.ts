import mongoose from 'mongoose';
import { requireMongoUri } from './env.js';
import { BookingModel } from '../modules/bookings/booking.model.js';
import { SlotLockModel } from '../modules/slot-locks/slot-lock.model.js';

export async function connectDatabase(uri = requireMongoUri()): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(uri);
  await Promise.all([BookingModel.syncIndexes(), SlotLockModel.syncIndexes()]);
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
