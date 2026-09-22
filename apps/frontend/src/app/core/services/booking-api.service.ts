import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiErrorBody,
  ApiSuccess,
  Booking,
  CreateBookingPayload,
  SlotLock,
  UpdateBookingPayload,
} from '../../shared/models/booking';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly bookingsUrl = '/api/bookings';
  private readonly locksUrl = '/api/slot-locks';

  listByDate(date: string): Observable<ApiSuccess<Booking[]>> {
    return this.http
      .get<ApiSuccess<Booking[]>>(this.bookingsUrl, { params: { date } })
      .pipe(catchError((error) => this.mapError(error)));
  }

  create(payload: CreateBookingPayload): Observable<ApiSuccess<Booking>> {
    return this.http
      .post<ApiSuccess<Booking>>(this.bookingsUrl, payload)
      .pipe(catchError((error) => this.mapError(error)));
  }

  update(id: string, payload: UpdateBookingPayload): Observable<ApiSuccess<Booking>> {
    return this.http
      .put<ApiSuccess<Booking>>(`${this.bookingsUrl}/${id}`, payload)
      .pipe(catchError((error) => this.mapError(error)));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.bookingsUrl}/${id}`)
      .pipe(catchError((error) => this.mapError(error)));
  }

  listLocks(date: string): Observable<ApiSuccess<SlotLock[]>> {
    return this.http
      .get<ApiSuccess<SlotLock[]>>(this.locksUrl, { params: { date } })
      .pipe(catchError((error) => this.mapError(error)));
  }

  acquireLock(
    date: string,
    time_slot: string,
    clientId: string,
  ): Observable<ApiSuccess<SlotLock>> {
    return this.http
      .post<ApiSuccess<SlotLock>>(this.locksUrl, { date, time_slot, clientId })
      .pipe(catchError((error) => this.mapError(error)));
  }

  releaseLock(lockId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.locksUrl}/${lockId}`)
      .pipe(catchError((error) => this.mapError(error)));
  }

  private mapError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse && error.error?.error) {
      const body = error.error as ApiErrorBody;
      return throwError(() => ({
        status: error.status,
        code: body.error.code,
        message: body.error.message,
      }));
    }

    return throwError(() => ({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    }));
  }
}
