import { Routes } from '@angular/router';
import { BookingPageComponent } from './features/bookings/booking-page/booking-page.component';

export const routes: Routes = [
  { path: '', component: BookingPageComponent },
  { path: '**', redirectTo: '' },
];
