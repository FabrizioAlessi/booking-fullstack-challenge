import type { BookingDocument } from './booking.model.js';
import { bookingRepository, type BookingRepository } from './booking.repository.js';
import type {
  BookingDto,
  CreateBookingInput,
  UpdateBookingInput,
} from './booking.types.js';
import { NotFoundError } from '../../errors/AppError.js';

function toBookingDto(doc: BookingDocument): BookingDto {
  return {
    id: doc.id,
    name: doc.name,
    date: doc.date,
    time_slot: doc.time_slot,
    ...(doc.note ? { note: doc.note } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class BookingService {
  constructor(private readonly repository: BookingRepository = bookingRepository) {}

  async create(input: CreateBookingInput): Promise<BookingDto> {
    const created = await this.repository.create(input);
    return toBookingDto(created);
  }

  async listByDate(date: string): Promise<BookingDto[]> {
    const bookings = await this.repository.findByDate(date);
    return bookings.map(toBookingDto);
  }

  async getById(id: string): Promise<BookingDto> {
    const booking = await this.repository.findById(id);
    if (!booking) {
      throw new NotFoundError();
    }
    return toBookingDto(booking);
  }

  async update(id: string, input: UpdateBookingInput): Promise<BookingDto> {
    const updated = await this.repository.updateById(id, input);
    return toBookingDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }
}

export const bookingService = new BookingService();
