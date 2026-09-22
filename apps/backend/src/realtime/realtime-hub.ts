import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

export type RealtimeEventType =
  | 'slot.locked'
  | 'slot.released'
  | 'booking.created'
  | 'booking.deleted';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: unknown;
}

class RealtimeHub {
  private readonly clients = new Set<Response>();

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  publish(event: RealtimeEvent): void {
    const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const client of this.clients) {
      client.write(chunk);
    }
  }
}

export const realtimeHub = new RealtimeHub();

export function createLockId(): string {
  return randomUUID();
}
