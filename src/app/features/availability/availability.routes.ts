import { Routes } from '@angular/router';
import { AvailabilityExceptionsListComponent } from './components/availability-exceptions-list.component';
import { AvailabilityExceptionFormComponent } from './components/availability-exception-form.component';
import { AvailabilityExceptionDetailComponent } from './components/availability-exception-detail.component';
import { AvailabilityRulesComponent } from './components/availability-rules.component';

export const availabilityRoutes: Routes = [
  { path: '', redirectTo: 'exceptions', pathMatch: 'full' },
  { path: 'rules', component: AvailabilityRulesComponent },
  { path: 'exceptions', component: AvailabilityExceptionsListComponent },
  { path: 'exceptions/new', component: AvailabilityExceptionFormComponent },
  { path: 'exceptions/:id', component: AvailabilityExceptionDetailComponent },
  { path: 'exceptions/:id/edit', component: AvailabilityExceptionFormComponent },
];
