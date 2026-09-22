export interface SlotLockDto {
  lockId: string;
  date: string;
  time_slot: string;
  expiresAt: string;
}

export interface AcquireSlotLockInput {
  date: string;
  time_slot: string;
}
