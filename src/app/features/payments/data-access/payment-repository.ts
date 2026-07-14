import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Payment } from '../models/payment.model';

export interface PaymentRepository {
  getAll(): Observable<readonly Payment[]>;
}

export const PAYMENT_REPOSITORY = new InjectionToken<PaymentRepository>('PaymentRepository');
