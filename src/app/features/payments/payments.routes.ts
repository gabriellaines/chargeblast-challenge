import { Routes } from '@angular/router';

import { PaymentMockRepositoryService } from './data-access/payment-mock-repository.service';
import { PAYMENT_REPOSITORY } from './data-access/payment-repository';
import { PaymentsPageComponent } from './payments-page/payments-page.component';
import { PaymentsFacade } from './state/payments.facade';
import { PaymentsStoreService } from './state/payments-store.service';

export const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { 
        provide: PAYMENT_REPOSITORY, useClass: PaymentMockRepositoryService 
      }, 
      PaymentsStoreService, 
      PaymentsFacade
    ],
    children: [
      { path: '', component: PaymentsPageComponent },
    ]
  }
];
