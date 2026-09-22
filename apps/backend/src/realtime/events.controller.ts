import type { Request, Response } from 'express';
import { realtimeHub } from '../realtime/realtime-hub.js';

export function eventsHandler(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  realtimeHub.addClient(res);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 15_000);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    realtimeHub.removeClient(res);
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
}
