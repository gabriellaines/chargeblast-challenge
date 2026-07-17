import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { paymentsToCsv } from '../data-access/payments-csv';
import { PaymentsFiltersComponent } from '../payments-filters/payments-filters.component';
import { PaymentsTableComponent } from '../payments-table/payments-table.component';
import { PaymentsToolbarComponent } from '../payments-toolbar/payments-toolbar.component';
import { PaymentsFacade } from '../state/payments.facade';

@Component({
  selector: 'app-payments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaymentsToolbarComponent, PaymentsFiltersComponent, PaymentsTableComponent],
  templateUrl: './payments-page.component.html',
  styleUrl: './payments-page.component.scss'
})
export class PaymentsPageComponent {
  protected readonly facade = inject(PaymentsFacade);
  protected readonly bannerDismissed = signal(false);

  protected dismissBanner(): void {
    this.bannerDismissed.set(true);
  }

  protected exportCsv(): void {
    const payments = this.facade.filteredPayments();
    const csv = paymentsToCsv(payments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-${payments.length}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
