import type { Request, Response } from 'express';
import { realtimeHub } from '../realtime/realtime-hub.js';
import { slotLockRepository } from '../modules/slot-locks/slot-lock.repository.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function eventsHandler(req: Request, res: Response): void {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
  if (!UUID_RE.test(clientId)) {
    res.status(400).json({
      error: {
        code: 'INVALID_CLIENT_ID',
        message: 'Query param clientId must be a valid UUID',
      },
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, clientId })}\n\n`);
  realtimeHub.addClient(clientId, res);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 15_000);

  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    clearInterval(heartbeat);
    const lockIds = realtimeHub.removeClient(clientId, res);
    if (lockIds.length === 0) {
      return;
    }

    // Fire-and-forget: disconnect path must not block; TTL remains the safety net.
    void releaseLocksOnDisconnect(lockIds);
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
}

async function releaseLocksOnDisconnect(lockIds: string[]): Promise<void> {
  for (const lockId of lockIds) {
    try {
      const released = await slotLockRepository.deleteByLockId(lockId);
      if (!released) {
        continue;
      }
      realtimeHub.publish({
        type: 'slot.released',
        payload: {
          date: released.date,
          time_slot: released.time_slot,
          lockId: released.lockId,
        },
      });
    } catch {
      // Best-effort cleanup; Mongo TTL will expire the lock if this fails.
    }
  }
}
