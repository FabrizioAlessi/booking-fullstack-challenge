import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiErrorBody,
  ApiSuccess,
  Booking,
  CreateBookingPayload,
} from '../../shared/models/booking';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/bookings';

  listByDate(date: string): Observable<ApiSuccess<Booking[]>> {
    return this.http
      .get<ApiSuccess<Booking[]>>(this.baseUrl, { params: { date } })
      .pipe(catchError((error) => this.mapError(error)));
  }

  create(payload: CreateBookingPayload): Observable<ApiSuccess<Booking>> {
    return this.http
      .post<ApiSuccess<Booking>>(this.baseUrl, payload)
      .pipe(catchError((error) => this.mapError(error)));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
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
