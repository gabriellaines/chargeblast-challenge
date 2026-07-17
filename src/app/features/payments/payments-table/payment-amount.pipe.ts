import { Pipe, PipeTransform } from '@angular/core';

import { CurrencyCode, toDecimalAmount } from '../models/payment.model';

@Pipe({
  name: 'paymentAmount'
})
export class PaymentAmountPipe implements PipeTransform {
  transform(amount: number, currency: CurrencyCode): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(toDecimalAmount(amount, currency));
  }
}
