import { realtimeHub } from '../../realtime/realtime-hub.js';
import { slotLockRepository, type SlotLockRepository } from './slot-lock.repository.js';
import type { AcquireSlotLockInput, SlotLockDto } from './slot-lock.types.js';

export class SlotLockService {
  constructor(private readonly repository: SlotLockRepository = slotLockRepository) {}

  async acquire(input: AcquireSlotLockInput): Promise<SlotLockDto> {
    const lock = await this.repository.acquire(input);
    realtimeHub.bindLock(input.clientId, lock.lockId);
    realtimeHub.publish({
      type: 'slot.locked',
      payload: lock,
    });
    return lock;
  }

  async listByDate(date: string): Promise<SlotLockDto[]> {
    return this.repository.findActiveByDate(date);
  }

  async release(lockId: string): Promise<SlotLockDto> {
    const lock = await this.repository.releaseByLockId(lockId);
    realtimeHub.unbindLock(lockId);
    realtimeHub.publish({
      type: 'slot.released',
      payload: {
        date: lock.date,
        time_slot: lock.time_slot,
        lockId: lock.lockId,
      },
    });
    return lock;
  }
}

export const slotLockService = new SlotLockService();
