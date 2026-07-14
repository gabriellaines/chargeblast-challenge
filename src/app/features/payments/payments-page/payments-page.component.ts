import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
}
