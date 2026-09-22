import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const slotLockSchema = new Schema(
  {
    date: { type: String, required: true },
    time_slot: { type: String, required: true },
    lockId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

slotLockSchema.index({ date: 1, time_slot: 1 }, { unique: true, name: 'uniq_slot_lock_date_time_slot' });
// Mongo TTL is best-effort; application still treats locks valid only while expiresAt > now.
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_slot_lock_expires_at' });

export type SlotLockAttributes = InferSchemaType<typeof slotLockSchema>;
export type SlotLockDocument = HydratedDocument<SlotLockAttributes>;

export const SlotLockModel = model<SlotLockAttributes>('SlotLock', slotLockSchema);
