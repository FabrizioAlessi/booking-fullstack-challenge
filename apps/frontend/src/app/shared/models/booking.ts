export interface Booking {
  id: string;
  name: string;
  date: string;
  time_slot: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  name: string;
  date: string;
  time_slot: string;
  note?: string;
  lockId?: string;
}

export interface SlotLock {
  lockId: string;
  date: string;
  time_slot: string;
  expiresAt: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];
export type SlotStatus = 'AVAILABLE' | 'LOCKED_BY_ME' | 'LOCKED_BY_OTHER' | 'BOOKED';
