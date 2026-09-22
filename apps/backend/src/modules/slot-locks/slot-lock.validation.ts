import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeSlotRegex = /^\d{2}:\d{2}$/;

export const acquireSlotLockSchema = z.object({
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
  time_slot: z.string().regex(timeSlotRegex, 'time_slot must be HH:mm'),
  clientId: z.string().uuid('clientId must be a valid UUID'),
});

export const listSlotLocksQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
});

export const slotLockIdParamsSchema = z.object({
  lockId: z.string().uuid(),
});

export type AcquireSlotLockDto = z.infer<typeof acquireSlotLockSchema>;
