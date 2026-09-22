import {
  NotFoundError,
  SlotLockConflictError,
} from '../../errors/AppError.js';
import { createLockId } from '../../realtime/realtime-hub.js';
import { env } from '../../config/env.js';
import { SlotLockModel, type SlotLockDocument } from './slot-lock.model.js';
import type { AcquireSlotLockInput, SlotLockDto } from './slot-lock.types.js';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Number((error as { code?: number | string }).code) === 11000
  );
}

function toDto(doc: SlotLockDocument): SlotLockDto {
  return {
    lockId: doc.lockId,
    date: doc.date,
    time_slot: doc.time_slot,
    expiresAt: doc.expiresAt.toISOString(),
  };
}

function nextExpiry(from = new Date()): Date {
  return new Date(from.getTime() + env.slotLockTtlMs);
}

export class SlotLockRepository {
  async acquire(input: AcquireSlotLockInput): Promise<SlotLockDto> {
    const now = new Date();
    const lockId = createLockId();
    const expiresAt = nextExpiry(now);

    try {
      const created = await SlotLockModel.create({
        ...input,
        lockId,
        expiresAt,
      });
      return toDto(created);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    // Reclaim only if the existing lock is already expired (TTL may lag).
    const reclaimed = await SlotLockModel.findOneAndUpdate(
      {
        date: input.date,
        time_slot: input.time_slot,
        expiresAt: { $lte: now },
      },
      {
        $set: {
          lockId,
          expiresAt,
        },
      },
      { new: true },
    ).exec();

    if (reclaimed) {
      return toDto(reclaimed);
    }

    throw new SlotLockConflictError();
  }

  async findActiveByDate(date: string): Promise<SlotLockDto[]> {
    const now = new Date();
    const locks = await SlotLockModel.find({
      date,
      expiresAt: { $gt: now },
    })
      .sort({ time_slot: 1 })
      .exec();

    return locks.map(toDto);
  }

  async findActiveByLockId(lockId: string): Promise<SlotLockDocument | null> {
    return SlotLockModel.findOne({
      lockId,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async releaseByLockId(lockId: string): Promise<SlotLockDto> {
    const deleted = await SlotLockModel.findOneAndDelete({ lockId }).exec();
    if (!deleted) {
      throw new NotFoundError('SLOT_LOCK_NOT_FOUND', 'Slot lock not found');
    }
    return toDto(deleted);
  }

  async deleteByLockId(lockId: string): Promise<SlotLockDto | null> {
    const deleted = await SlotLockModel.findOneAndDelete({ lockId }).exec();
    return deleted ? toDto(deleted) : null;
  }
}

export const slotLockRepository = new SlotLockRepository();
