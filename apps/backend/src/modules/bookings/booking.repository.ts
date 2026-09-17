import { ConflictError, NotFoundError } from '../../errors/AppError.js';
import { BookingModel, type BookingDocument } from './booking.model.js';
import type { CreateBookingInput, UpdateBookingInput } from './booking.types.js';

interface DuplicateKeyLike {
  code?: number | string;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyLike {
  // Avoid fragile instanceof across nested mongodb copies used by Mongoose.
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Number((error as DuplicateKeyLike).code) === 11000
  );
}

function toConflictError(error: DuplicateKeyLike): ConflictError {
  return new ConflictError(
    'BOOKING_SLOT_CONFLICT',
    'The selected time slot is already booked',
    error.keyValue ? { keyValue: error.keyValue } : undefined,
  );
}

export class BookingRepository {
  async create(input: CreateBookingInput): Promise<BookingDocument> {
    try {
      return await BookingModel.create(input);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw toConflictError(error);
      }
      throw error;
    }
  }

  async findByDate(date: string): Promise<BookingDocument[]> {
    return BookingModel.find({ date }).sort({ time_slot: 1 }).exec();
  }

  async findById(id: string): Promise<BookingDocument | null> {
    return BookingModel.findById(id).exec();
  }

  async updateById(id: string, input: UpdateBookingInput): Promise<BookingDocument> {
    try {
      const updated = await BookingModel.findByIdAndUpdate(id, input, {
        new: true,
        runValidators: true,
      }).exec();

      if (!updated) {
        throw new NotFoundError();
      }

      return updated;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw toConflictError(error);
      }
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    const deleted = await BookingModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundError();
    }
  }
}

export const bookingRepository = new BookingRepository();
