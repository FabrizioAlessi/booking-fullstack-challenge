export interface BookingDto {
  id: string;
  name: string;
  date: string;
  time_slot: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  name: string;
  date: string;
  time_slot: string;
  note?: string;
  lockId?: string;
}

export interface UpdateBookingInput {
  name?: string;
  date?: string;
  time_slot?: string;
  note?: string | null;
}
