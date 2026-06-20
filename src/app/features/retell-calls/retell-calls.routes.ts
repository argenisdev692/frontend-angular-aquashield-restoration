import { Routes } from '@angular/router';
import { RetellCallsListComponent } from './components/retell-calls-list.component';
import { RetellCallsDetailComponent } from './components/retell-calls-detail.component';

// Read-only resource: list + detail only (records originate from Retell, no create/edit).
export const retellCallsRoutes: Routes = [
  { path: '', component: RetellCallsListComponent },
  { path: ':id', component: RetellCallsDetailComponent },
];
