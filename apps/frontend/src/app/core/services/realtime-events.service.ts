import { Injectable, OnDestroy, inject, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Booking, SlotLock } from '../../shared/models/booking';

export type RealtimeEvent =
  | { type: 'slot.locked'; payload: SlotLock }
  | { type: 'slot.released'; payload: Pick<SlotLock, 'date' | 'time_slot' | 'lockId'> }
  | { type: 'booking.created'; payload: Booking }
  | { type: 'booking.deleted'; payload: { id: string; date: string; time_slot: string } };

@Injectable({ providedIn: 'root' })
export class RealtimeEventsService implements OnDestroy {
  private readonly zone = inject(NgZone);
  private source: EventSource | null = null;
  private readonly eventsSubject = new Subject<RealtimeEvent>();

  readonly events$: Observable<RealtimeEvent> = this.eventsSubject.asObservable();

  connect(): void {
    if (this.source) {
      return;
    }

    // Direct backend URL avoids proxy buffering of long-lived SSE streams.
    const url = 'http://localhost:3000/api/events';
    this.source = new EventSource(url);

    const forward =
      (type: RealtimeEvent['type']) =>
      (event: MessageEvent<string>): void => {
        this.zone.run(() => {
          this.eventsSubject.next({
            type,
            payload: JSON.parse(event.data),
          } as RealtimeEvent);
        });
      };

    this.source.addEventListener('slot.locked', forward('slot.locked'));
    this.source.addEventListener('slot.released', forward('slot.released'));
    this.source.addEventListener('booking.created', forward('booking.created'));
    this.source.addEventListener('booking.deleted', forward('booking.deleted'));
  }

  ngOnDestroy(): void {
    this.source?.close();
    this.source = null;
    this.eventsSubject.complete();
  }
}
