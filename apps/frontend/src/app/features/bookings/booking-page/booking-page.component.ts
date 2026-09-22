import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { RealtimeEventsService } from '../../../core/services/realtime-events.service';
import {
  Booking,
  SlotLock,
  SlotStatus,
  TIME_SLOTS,
  TimeSlot,
} from '../../../shared/models/booking';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly bookingApi = inject(BookingApiService);
  private readonly realtime = inject(RealtimeEventsService);

  readonly timeSlots = TIME_SLOTS;
  bookings: Booking[] = [];
  locksBySlot = new Map<string, SlotLock>();
  myLock: SlotLock | null = null;
  loading = false;
  feedback: string | null = null;
  errorMessage: string | null = null;

  private eventsSub?: Subscription;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    date: [this.todayIso(), Validators.required],
    time_slot: ['', Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.realtime.connect();
    this.eventsSub = this.realtime.events$.subscribe((event) => {
      const selectedDate = this.form.controls.date.value;

      if (event.type === 'slot.locked' && event.payload.date === selectedDate) {
        if (this.myLock?.lockId !== event.payload.lockId) {
          this.locksBySlot.set(event.payload.time_slot, event.payload);
        }
        return;
      }

      if (event.type === 'slot.released' && event.payload.date === selectedDate) {
        const current = this.locksBySlot.get(event.payload.time_slot);
        if (current?.lockId === event.payload.lockId) {
          this.locksBySlot.delete(event.payload.time_slot);
        }
        if (this.myLock?.lockId === event.payload.lockId) {
          this.myLock = null;
          if (this.form.controls.time_slot.value === event.payload.time_slot) {
            this.form.controls.time_slot.setValue('');
          }
        }
        return;
      }

      if (event.type === 'booking.created' && event.payload.date === selectedDate) {
        this.upsertBooking(event.payload);
        this.locksBySlot.delete(event.payload.time_slot);
        return;
      }

      if (event.type === 'booking.deleted' && event.payload.date === selectedDate) {
        this.bookings = this.bookings.filter((item) => item.id !== event.payload.id);
      }
    });

    this.reloadDayState();
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
    if (this.myLock) {
      this.bookingApi.releaseLock(this.myLock.lockId).subscribe({ error: () => undefined });
    }
  }

  slotStatus(slot: TimeSlot): SlotStatus {
    if (this.bookings.some((booking) => booking.time_slot === slot)) {
      return 'BOOKED';
    }
    if (this.myLock?.time_slot === slot) {
      return 'LOCKED_BY_ME';
    }
    if (this.locksBySlot.has(slot)) {
      return 'LOCKED_BY_OTHER';
    }
    return 'AVAILABLE';
  }

  slotLabel(slot: TimeSlot): string {
    switch (this.slotStatus(slot)) {
      case 'BOOKED':
        return 'Occupato';
      case 'LOCKED_BY_ME':
        return 'Bloccato da te';
      case 'LOCKED_BY_OTHER':
        return 'Bloccato';
      default:
        return 'Libero';
    }
  }

  isSlotDisabled(slot: TimeSlot): boolean {
    const status = this.slotStatus(slot);
    return this.loading || status === 'BOOKED' || status === 'LOCKED_BY_OTHER';
  }

  selectSlot(slot: TimeSlot): void {
    const status = this.slotStatus(slot);
    if (this.loading || status === 'BOOKED' || status === 'LOCKED_BY_OTHER') {
      return;
    }

    if (status === 'LOCKED_BY_ME') {
      this.form.controls.time_slot.setValue(slot);
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    const previousLock = this.myLock;
    const date = this.form.controls.date.value;

    this.bookingApi.acquireLock(date, slot).subscribe({
      next: (response) => {
        this.myLock = response.data;
        this.form.controls.time_slot.setValue(slot);
        this.loading = false;

        if (previousLock && previousLock.lockId !== response.data.lockId) {
          this.bookingApi.releaseLock(previousLock.lockId).subscribe({ error: () => undefined });
        }
      },
      error: (error: { status?: number; code?: string; message?: string }) => {
        this.loading = false;
        if (error.status === 409 || error.code === 'SLOT_LOCK_CONFLICT') {
          this.errorMessage = 'Questo slot e temporaneamente bloccato da un altro utente.';
          this.reloadDayState();
          return;
        }
        this.errorMessage = error.message ?? 'Impossibile bloccare lo slot.';
      },
    });
  }

  onDateChange(): void {
    const release$ = this.myLock
      ? this.bookingApi.releaseLock(this.myLock.lockId)
      : undefined;
    this.myLock = null;
    this.form.controls.time_slot.setValue('');
    this.locksBySlot.clear();

    if (release$) {
      release$.subscribe({
        next: () => this.reloadDayState(),
        error: () => this.reloadDayState(),
      });
      return;
    }

    this.reloadDayState();
  }

  submit(): void {
    this.feedback = null;
    this.errorMessage = null;

    if (this.form.invalid || !this.myLock) {
      this.form.markAllAsTouched();
      if (!this.myLock) {
        this.errorMessage = 'Seleziona e blocca uno slot prima di prenotare.';
      }
      return;
    }

    this.loading = true;
    const payload = this.form.getRawValue();
    const note = payload.note.trim();

    this.bookingApi
      .create({
        name: payload.name.trim(),
        date: payload.date,
        time_slot: payload.time_slot,
        lockId: this.myLock.lockId,
        ...(note ? { note } : {}),
      })
      .subscribe({
        next: (response) => {
          this.feedback = 'Prenotazione creata.';
          this.myLock = null;
          this.form.patchValue({ name: '', time_slot: '', note: '' });
          this.upsertBooking(response.data);
          this.loading = false;
        },
        error: (error: { status?: number; code?: string; message?: string }) => {
          if (error.status === 409 || error.code === 'BOOKING_SLOT_CONFLICT') {
            this.errorMessage =
              'Questo slot e stato appena prenotato da un altro utente.';
            this.myLock = null;
            this.reloadDayState();
            return;
          }
          if (error.code === 'SLOT_LOCK_INVALID') {
            this.errorMessage = 'Il blocco dello slot e scaduto. Seleziona di nuovo lo slot.';
            this.myLock = null;
            this.reloadDayState();
            return;
          }
          this.loading = false;
          this.errorMessage = error.message ?? 'Errore durante la creazione.';
        },
      });
  }

  deleteBooking(booking: Booking): void {
    this.loading = true;
    this.feedback = null;
    this.errorMessage = null;

    this.bookingApi.delete(booking.id).subscribe({
      next: () => {
        this.feedback = 'Prenotazione eliminata.';
        this.bookings = this.bookings.filter((item) => item.id !== booking.id);
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message ?? 'Errore durante l’eliminazione.';
      },
    });
  }

  reloadDayState(): void {
    const date = this.form.controls.date.value;
    if (!date) {
      return;
    }

    this.loading = true;
    forkJoin({
      bookings: this.bookingApi.listByDate(date),
      locks: this.bookingApi.listLocks(date),
    }).subscribe({
      next: ({ bookings, locks }) => {
        this.bookings = bookings.data;
        this.locksBySlot = new Map(
          locks.data
            .filter((lock) => lock.lockId !== this.myLock?.lockId)
            .map((lock) => [lock.time_slot, lock]),
        );
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message ?? 'Impossibile caricare lo stato del giorno.';
      },
    });
  }

  private upsertBooking(booking: Booking): void {
    const without = this.bookings.filter((item) => item.id !== booking.id);
    this.bookings = [...without, booking].sort((a, b) =>
      a.time_slot.localeCompare(b.time_slot),
    );
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
