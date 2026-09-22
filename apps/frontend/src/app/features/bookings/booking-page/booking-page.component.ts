import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { RealtimeEventsService } from '../../../core/services/realtime-events.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
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
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly bookingApi = inject(BookingApiService);
  private readonly realtime = inject(RealtimeEventsService);
  private readonly toast = inject(ToastService);

  readonly timeSlots = TIME_SLOTS;
  bookings: Booking[] = [];
  locksBySlot = new Map<string, SlotLock>();
  myLock: SlotLock | null = null;
  loading = false;
  bookingsExpanded = true;
  /** When set, the form submits an update instead of a create. */
  editingId: string | null = null;
  private editingOriginal: { date: string; time_slot: string } | null = null;

  private eventsSub?: Subscription;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    date: [this.todayIso(), Validators.required],
    time_slot: ['', Validators.required],
    note: [''],
  });

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  /** Create always needs a lock; edit keeps the original slot without one. */
  get canSubmit(): boolean {
    if (this.loading || this.form.invalid) {
      return false;
    }
    if (this.myLock) {
      return true;
    }
    return this.isKeepingOriginalSlot();
  }

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

      if (event.type === 'booking.updated') {
        // Drop by id first so a date move removes it from the current day list.
        this.bookings = this.bookings.filter((item) => item.id !== event.payload.id);
        if (event.payload.date === selectedDate) {
          this.upsertBooking(event.payload);
        }
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
    // While editing, the booking's own slot must stay selectable (not BOOKED for this user).
    const bookedByOther = this.bookings.some(
      (booking) => booking.time_slot === slot && booking.id !== this.editingId,
    );
    if (bookedByOther) {
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
        return 'Selezionato';
      case 'LOCKED_BY_OTHER':
        return 'Bloccato';
      default:
        if (
          this.isEditing &&
          this.editingOriginal?.time_slot === slot &&
          this.form.controls.time_slot.value === slot &&
          this.editingOriginal.date === this.form.controls.date.value
        ) {
          return 'Attuale';
        }
        return 'Libero';
    }
  }

  isSlotDisabled(slot: TimeSlot): boolean {
    const status = this.slotStatus(slot);
    return this.loading || status === 'BOOKED' || status === 'LOCKED_BY_OTHER';
  }

  /** Slot currently chosen in the form (selected or locked-by-me). */
  isSlotSelected(slot: TimeSlot): boolean {
    return this.form.controls.time_slot.value === slot || this.slotStatus(slot) === 'LOCKED_BY_ME';
  }

  /** In edit mode, the active slot uses warning highlight (same as Modifica). */
  isEditingSelectedSlot(slot: TimeSlot): boolean {
    return this.isEditing && this.form.controls.time_slot.value === slot;
  }

  selectSlot(slot: TimeSlot): void {
    const status = this.slotStatus(slot);
    if (this.loading || status === 'BOOKED' || status === 'LOCKED_BY_OTHER') {
      return;
    }

    // Edit: re-selecting the original slot needs no lock (already owned via the booking).
    if (
      this.isEditing &&
      this.editingOriginal &&
      this.editingOriginal.date === this.form.controls.date.value &&
      this.editingOriginal.time_slot === slot
    ) {
      if (this.myLock) {
        const previousLockId = this.myLock.lockId;
        this.myLock = null;
        this.bookingApi.releaseLock(previousLockId).subscribe({ error: () => undefined });
      }
      this.form.controls.time_slot.setValue(slot);
      return;
    }

    // Toggle: secondo click sullo slot già bloccato da me → rilascio + SSE slot.released
    if (status === 'LOCKED_BY_ME' && this.myLock) {
      this.releaseMyLock();
      return;
    }

    this.loading = true;
    const previousLock = this.myLock;
    const date = this.form.controls.date.value;

    this.bookingApi.acquireLock(date, slot, this.realtime.clientId).subscribe({
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
          this.toast.error('Questo slot e temporaneamente bloccato da un altro utente.');
          this.reloadDayState();
          return;
        }
        this.toast.error(error.message ?? 'Impossibile bloccare lo slot.');
      },
    });
  }

  private releaseMyLock(): void {
    if (!this.myLock) {
      return;
    }

    this.loading = true;
    const lockId = this.myLock.lockId;
    const timeSlot = this.myLock.time_slot;

    this.bookingApi.releaseLock(lockId).subscribe({
      next: () => {
        this.myLock = null;
        if (this.form.controls.time_slot.value === timeSlot) {
          this.form.controls.time_slot.setValue('');
        }
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.toast.error(error.message ?? 'Impossibile rilasciare lo slot.');
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

  startEdit(booking: Booking): void {
    if (this.myLock) {
      const lockId = this.myLock.lockId;
      this.myLock = null;
      this.bookingApi.releaseLock(lockId).subscribe({ error: () => undefined });
    }

    this.editingId = booking.id;
    this.editingOriginal = { date: booking.date, time_slot: booking.time_slot };
    this.form.patchValue({
      name: booking.name,
      date: booking.date,
      time_slot: booking.time_slot,
      note: booking.note ?? '',
    });
    this.reloadDayState();
  }

  cancelEdit(): void {
    if (this.myLock) {
      const lockId = this.myLock.lockId;
      this.myLock = null;
      this.bookingApi.releaseLock(lockId).subscribe({ error: () => undefined });
    }

    this.editingId = null;
    this.editingOriginal = null;
    this.form.patchValue({ name: '', time_slot: '', note: '' });
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      if (!this.myLock && !this.isKeepingOriginalSlot()) {
        this.toast.error(
          this.isEditing
            ? 'Seleziona uno slot (mantieni quello attuale o blocca uno libero).'
            : 'Seleziona e blocca uno slot prima di prenotare.',
        );
      }
      return;
    }

    this.loading = true;
    const payload = this.form.getRawValue();
    const note = payload.note.trim();

    if (this.editingId) {
      this.submitUpdate(this.editingId, payload, note);
      return;
    }

    this.submitCreate(payload, note);
  }

  private submitCreate(
    payload: { name: string; date: string; time_slot: string; note: string },
    note: string,
  ): void {
    if (!this.myLock) {
      this.loading = false;
      return;
    }

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
          this.toast.success('Prenotazione creata.');
          this.myLock = null;
          this.form.patchValue({ name: '', time_slot: '', note: '' });
          this.upsertBooking(response.data);
          this.loading = false;
        },
        error: (error: { status?: number; code?: string; message?: string }) => {
          this.handleMutationError(error, 'Errore durante la creazione.');
        },
      });
  }

  private submitUpdate(
    id: string,
    payload: { name: string; date: string; time_slot: string; note: string },
    note: string,
  ): void {
    const lockToRelease = this.myLock;

    this.bookingApi
      .update(id, {
        name: payload.name.trim(),
        date: payload.date,
        time_slot: payload.time_slot,
        note: note ? note : null,
      })
      .subscribe({
        next: (response) => {
          this.toast.success('Prenotazione aggiornata.');
          this.myLock = null;
          this.editingId = null;
          this.editingOriginal = null;
          this.form.patchValue({ name: '', time_slot: '', note: '' });

          this.bookings = this.bookings.filter((item) => item.id !== response.data.id);
          if (response.data.date === this.form.controls.date.value) {
            this.upsertBooking(response.data);
          }

          if (lockToRelease) {
            this.bookingApi.releaseLock(lockToRelease.lockId).subscribe({
              error: () => undefined,
            });
          }

          this.loading = false;
        },
        error: (error: { status?: number; code?: string; message?: string }) => {
          this.handleMutationError(error, 'Errore durante l’aggiornamento.');
        },
      });
  }

  private handleMutationError(
    error: { status?: number; code?: string; message?: string },
    fallbackMessage: string,
  ): void {
    if (error.status === 409 || error.code === 'BOOKING_SLOT_CONFLICT') {
      this.toast.error('Questo slot e stato appena prenotato da un altro utente.');
      this.myLock = null;
      this.reloadDayState();
      return;
    }
    if (error.code === 'SLOT_LOCK_INVALID') {
      this.toast.error('Il blocco dello slot e scaduto. Seleziona di nuovo lo slot.');
      this.myLock = null;
      this.reloadDayState();
      return;
    }
    this.loading = false;
    this.toast.error(error.message ?? fallbackMessage);
  }

  deleteBooking(booking: Booking): void {
    if (this.editingId === booking.id) {
      this.cancelEdit();
    }

    this.loading = true;

    this.bookingApi.delete(booking.id).subscribe({
      next: () => {
        this.toast.success('Prenotazione eliminata.');
        this.bookings = this.bookings.filter((item) => item.id !== booking.id);
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.toast.error(error.message ?? 'Errore durante l’eliminazione.');
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
        this.toast.error(error.message ?? 'Impossibile caricare lo stato del giorno.');
      },
    });
  }

  private isKeepingOriginalSlot(): boolean {
    return (
      this.isEditing &&
      this.editingOriginal !== null &&
      this.form.controls.date.value === this.editingOriginal.date &&
      this.form.controls.time_slot.value === this.editingOriginal.time_slot
    );
  }

  private upsertBooking(booking: Booking): void {
    const without = this.bookings.filter((item) => item.id !== booking.id);
    this.bookings = [...without, booking].sort((a, b) =>
      a.time_slot.localeCompare(b.time_slot),
    );
  }

  formatSelectedDate(isoDate: string): string {
    // Parse YYYY-MM-DD in locale senza UTC shift (new Date(iso) a mezzanotte UTC)
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) {
      return isoDate;
    }
    return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
