import { Router } from 'express';
import { validateRequest } from '../../middlewares/validate-request.js';
import { slotLockController } from './slot-lock.controller.js';
import {
  acquireSlotLockSchema,
  listSlotLocksQuerySchema,
  slotLockIdParamsSchema,
} from './slot-lock.validation.js';

export const slotLockRoutes = Router();

slotLockRoutes.get(
  '/',
  validateRequest(listSlotLocksQuerySchema, 'query'),
  slotLockController.list,
);

slotLockRoutes.post(
  '/',
  validateRequest(acquireSlotLockSchema, 'body'),
  slotLockController.acquire,
);

slotLockRoutes.delete(
  '/:lockId',
  validateRequest(slotLockIdParamsSchema, 'params'),
  slotLockController.release,
);
