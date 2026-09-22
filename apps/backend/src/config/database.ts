import mongoose from 'mongoose';
import { env } from './env.js';
import { BookingModel } from '../modules/bookings/booking.model.js';

export async function connectDatabase(uri = env.mongodbUri): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(uri);
  await BookingModel.syncIndexes();
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
