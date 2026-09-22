import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeSlotRegex = /^\d{2}:\d{2}$/;

export const createBookingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
  time_slot: z.string().regex(timeSlotRegex, 'time_slot must be HH:mm'),
  note: z.string().trim().max(500).optional(),
  lockId: z.string().uuid().optional(),
});

export const updateBookingSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD').optional(),
    time_slot: z.string().regex(timeSlotRegex, 'time_slot must be HH:mm').optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const bookingIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listBookingsQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export type UpdateBookingDto = z.infer<typeof updateBookingSchema>;
