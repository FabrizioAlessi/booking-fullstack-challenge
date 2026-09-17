import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const bookingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD (domain day, not UTC instant)
    time_slot: { type: String, required: true }, // HH:mm
    note: { type: String, required: false, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// DB is the source of truth for uniqueness under concurrency — never rely on findOne+create.
bookingSchema.index(
  { date: 1, time_slot: 1 },
  { unique: true, name: 'uniq_booking_date_time_slot' },
);

export type BookingAttributes = InferSchemaType<typeof bookingSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type BookingDocument = HydratedDocument<BookingAttributes>;

export const BookingModel = model<BookingAttributes>('Booking', bookingSchema);
