import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'payments', pathMatch: 'full' },
  { path: 'payments', loadChildren: () => import('./features/payments/payments.routes').then((m) => m.PAYMENTS_ROUTES) }
];
