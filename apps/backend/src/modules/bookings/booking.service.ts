import type { BookingDocument } from './booking.model.js';
import { bookingRepository, type BookingRepository } from './booking.repository.js';
import type {
  BookingDto,
  CreateBookingInput,
  UpdateBookingInput,
} from './booking.types.js';
import { NotFoundError, SlotLockInvalidError } from '../../errors/AppError.js';
import { realtimeHub } from '../../realtime/realtime-hub.js';
import { slotLockRepository } from '../slot-locks/slot-lock.repository.js';

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
    const { lockId, ...bookingInput } = input;

    if (lockId) {
      const lock = await slotLockRepository.findActiveByLockId(lockId);
      if (
        !lock ||
        lock.date !== bookingInput.date ||
        lock.time_slot !== bookingInput.time_slot
      ) {
        throw new SlotLockInvalidError();
      }
    }

    const created = await this.repository.create(bookingInput);
    const dto = toBookingDto(created);

    if (lockId) {
      const released = await slotLockRepository.deleteByLockId(lockId);
      if (released) {
        realtimeHub.unbindLock(lockId);
        realtimeHub.publish({
          type: 'slot.released',
          payload: {
            date: released.date,
            time_slot: released.time_slot,
            lockId: released.lockId,
          },
        });
      }
    }

    realtimeHub.publish({
      type: 'booking.created',
      payload: dto,
    });

    return dto;
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
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }

    await this.repository.deleteById(id);
    realtimeHub.publish({
      type: 'booking.deleted',
      payload: {
        id: existing.id,
        date: existing.date,
        time_slot: existing.time_slot,
      },
    });
  }
}

export const bookingService = new BookingService();
