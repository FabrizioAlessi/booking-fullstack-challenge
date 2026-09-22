export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(
    code = 'BOOKING_SLOT_CONFLICT',
    message = 'The selected time slot is already booked',
    details?: unknown,
  ) {
    super(409, code, message, details);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    code = 'BOOKING_NOT_FOUND',
    message = 'Booking not found',
    details?: unknown,
  ) {
    super(404, code, message, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationAppError extends AppError {
  constructor(message = 'Request validation failed', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationAppError';
  }
}

export class SlotLockConflictError extends ConflictError {
  constructor(message = 'The selected time slot is temporarily locked', details?: unknown) {
    super('SLOT_LOCK_CONFLICT', message, details);
    this.name = 'SlotLockConflictError';
  }
}

export class SlotLockInvalidError extends AppError {
  constructor(
    message = 'Slot lock is missing, expired, or does not match the booking',
    details?: unknown,
  ) {
    super(409, 'SLOT_LOCK_INVALID', message, details);
    this.name = 'SlotLockInvalidError';
  }
}
