import { Routes } from '@angular/router';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { DashboardComponent } from './dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { CompanyDataEditComponent } from './features/company-data/components/company-data-edit.component';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginFormComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'company-data', component: CompanyDataEditComponent, canActivate: [authGuard] },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes').then((m) => m.usersRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'appointments',
    loadChildren: () => import('./features/appointments/appointments.routes').then((m) => m.appointmentsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'availability',
    loadChildren: () => import('./features/availability/availability.routes').then((m) => m.availabilityRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'blog-categories',
    loadChildren: () => import('./features/blog-categories/blog-categories.routes').then((m) => m.blogCategoriesRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'posts',
    loadChildren: () => import('./features/posts/posts.routes').then((m) => m.postsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'activity-logs',
    loadChildren: () => import('./features/activity-logs/activity-logs.routes').then((m) => m.activityLogsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'contact-support',
    loadChildren: () => import('./features/contact-support/contact-support.routes').then((m) => m.contactSupportRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.routes').then((m) => m.rolesRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'backups',
    loadChildren: () => import('./features/backups/backups.routes').then((m) => m.backupsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'social-media',
    loadChildren: () => import('./features/social-media/social-media.routes').then((m) => m.socialMediaRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'campaigns',
    loadChildren: () => import('./features/campaigns/campaigns.routes').then((m) => m.campaignsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'retell-calls',
    loadChildren: () => import('./features/retell-calls/retell-calls.routes').then((m) => m.retellCallsRoutes),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
