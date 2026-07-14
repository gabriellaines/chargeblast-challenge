import { Pipe, PipeTransform } from '@angular/core';

import { CurrencyCode, ZERO_DECIMAL_CURRENCIES } from '../models/payment.model';

@Pipe({
  name: 'paymentAmount'
})
export class PaymentAmountPipe implements PipeTransform {
  transform(amount: number, currency: CurrencyCode): string {
    const value = ZERO_DECIMAL_CURRENCIES.includes(currency) ? amount : amount / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }
}
