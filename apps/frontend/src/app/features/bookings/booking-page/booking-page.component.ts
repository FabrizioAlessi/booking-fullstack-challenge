import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BookingApiService } from '../../../core/services/booking-api.service';
import {
  Booking,
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
export class BookingPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bookingApi = inject(BookingApiService);

  readonly timeSlots = TIME_SLOTS;
  bookings: Booking[] = [];
  loading = false;
  feedback: string | null = null;
  errorMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    date: [this.todayIso(), Validators.required],
    time_slot: ['', Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.reloadBookings();
  }

  slotStatus(slot: TimeSlot): SlotStatus {
    return this.bookings.some((booking) => booking.time_slot === slot)
      ? 'BOOKED'
      : 'AVAILABLE';
  }

  selectSlot(slot: TimeSlot): void {
    if (this.slotStatus(slot) === 'BOOKED' || this.loading) {
      return;
    }
    this.form.controls.time_slot.setValue(slot);
  }

  onDateChange(): void {
    this.form.controls.time_slot.setValue('');
    this.reloadBookings();
  }

  submit(): void {
    this.feedback = null;
    this.errorMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
        ...(note ? { note } : {}),
      })
      .subscribe({
        next: () => {
          this.feedback = 'Prenotazione creata.';
          this.form.patchValue({ name: '', time_slot: '', note: '' });
          this.reloadBookings();
        },
        error: (error: { status?: number; code?: string; message?: string }) => {
          if (error.status === 409 || error.code === 'BOOKING_SLOT_CONFLICT') {
            this.errorMessage =
              'Questo slot e stato appena prenotato da un altro utente.';
            this.reloadBookings();
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
        this.reloadBookings();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message ?? 'Errore durante l’eliminazione.';
      },
    });
  }

  reloadBookings(): void {
    const date = this.form.controls.date.value;
    if (!date) {
      return;
    }

    this.loading = true;
    this.bookingApi.listByDate(date).subscribe({
      next: (response) => {
        this.bookings = response.data;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message ?? 'Impossibile caricare le prenotazioni.';
      },
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
