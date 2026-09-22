import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPageComponent } from './booking-page.component';
import { Booking } from '../../../shared/models/booking';

describe('BookingPageComponent', () => {
  let fixture: ComponentFixture<BookingPageComponent>;
  let component: BookingPageComponent;
  let httpMock: HttpTestingController;

  const sampleBooking: Booking = {
    id: 'booking-1',
    name: 'Mario Rossi',
    date: '2026-09-20',
    time_slot: '10:00',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    component.form.controls.date.setValue('2026-09-20');
    fixture.detectChanges();

    const initialList = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === '/api/bookings',
    );
    initialList.flush({ data: [sampleBooking] });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders booked slots as disabled and not selectable', () => {
    const bookedButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button.slot.slot--booked',
    );

    expect(bookedButton).not.toBeNull();
    expect(bookedButton?.disabled).toBeTrue();
    expect(component.slotStatus('10:00')).toBe('BOOKED');

    component.selectSlot('10:00');
    expect(component.form.controls.time_slot.value).toBe('');
  });

  it('shows conflict message and refreshes availability on 409', () => {
    component.form.setValue({
      name: 'Luigi Bianchi',
      date: '2026-09-20',
      time_slot: '10:30',
      note: '',
    });

    component.submit();

    const createReq = httpMock.expectOne('/api/bookings');
    expect(createReq.request.method).toBe('POST');
    createReq.flush(
      {
        error: {
          code: 'BOOKING_SLOT_CONFLICT',
          message: 'The selected time slot is already booked',
        },
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.errorMessage).toBe(
      'Questo slot e stato appena prenotato da un altro utente.',
    );

    const refreshReq = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === '/api/bookings',
    );
    refreshReq.flush({
      data: [
        sampleBooking,
        {
          ...sampleBooking,
          id: 'booking-2',
          name: 'Altro',
          time_slot: '10:30',
        },
      ],
    });
    fixture.detectChanges();

    expect(component.slotStatus('10:30')).toBe('BOOKED');
  });

  it('removes a booking and refreshes slot availability after delete', () => {
    component.deleteBooking(sampleBooking);

    const deleteReq = httpMock.expectOne('/api/bookings/booking-1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const refreshReq = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === '/api/bookings',
    );
    refreshReq.flush({ data: [] });
    fixture.detectChanges();

    expect(component.feedback).toBe('Prenotazione eliminata.');
    expect(component.bookings).toEqual([]);
    expect(component.slotStatus('10:00')).toBe('AVAILABLE');
  });
});
