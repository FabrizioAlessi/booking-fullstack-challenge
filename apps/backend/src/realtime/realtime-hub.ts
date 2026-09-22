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

interface ClientConnection {
  res: Response | null;
  lockIds: Set<string>;
}

class RealtimeHub {
  private readonly clients = new Map<string, ClientConnection>();
  private readonly lockToClient = new Map<string, string>();

  addClient(clientId: string, res: Response): void {
    const existing = this.clients.get(clientId);
    if (existing) {
      // Reconnect: keep lock ownership, swap the SSE response.
      existing.res = res;
      return;
    }
    this.clients.set(clientId, { res, lockIds: new Set() });
  }

  /**
   * Removes the SSE client only if `res` is still the active connection.
   * Returns lockIds owned by that client so the caller can release them.
   */
  removeClient(clientId: string, res: Response): string[] {
    const connection = this.clients.get(clientId);
    if (!connection || connection.res !== res) {
      return [];
    }

    const lockIds = [...connection.lockIds];
    for (const lockId of lockIds) {
      this.lockToClient.delete(lockId);
    }
    this.clients.delete(clientId);
    return lockIds;
  }

  bindLock(clientId: string, lockId: string): void {
    let connection = this.clients.get(clientId);
    if (!connection) {
      // Acquire may race slightly ahead of SSE; track ownership without a live stream.
      connection = { res: null, lockIds: new Set() };
      this.clients.set(clientId, connection);
    }

    const previousOwner = this.lockToClient.get(lockId);
    if (previousOwner && previousOwner !== clientId) {
      this.clients.get(previousOwner)?.lockIds.delete(lockId);
    }

    connection.lockIds.add(lockId);
    this.lockToClient.set(lockId, clientId);
  }

  unbindLock(lockId: string): void {
    const clientId = this.lockToClient.get(lockId);
    if (!clientId) {
      return;
    }
    this.lockToClient.delete(lockId);
    this.clients.get(clientId)?.lockIds.delete(lockId);
  }

  publish(event: RealtimeEvent): void {
    const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const connection of this.clients.values()) {
      if (!connection.res) {
        continue;
      }
      connection.res.write(chunk);
    }
  }
}

export const realtimeHub = new RealtimeHub();

export function createLockId(): string {
  return randomUUID();
}
