import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PaymentStatus } from '../../models/payment.model';
import { PaymentsTotals } from '../../state/payments-store.service';

interface StatusTabOption {
  readonly value: PaymentStatus;
  readonly label: string;
}

const STATUS_TABS: readonly StatusTabOption[] = [
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'failed', label: 'Failed' },
  { value: 'uncaptured', label: 'Uncaptured' }
];

@Component({
  selector: 'app-payment-status-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-status-tabs.component.html',
  styleUrl: './payment-status-tabs.component.scss'
})
export class PaymentStatusTabsComponent {
  readonly statuses = input.required<readonly PaymentStatus[]>();
  readonly counts = input.required<PaymentsTotals>();
  readonly statusesChange = output<readonly PaymentStatus[]>();

  protected readonly tabs = STATUS_TABS;

  protected isActive(status: PaymentStatus): boolean {
    return this.statuses().includes(status);
  }

  protected countFor(status: PaymentStatus): number {
    return this.counts().byStatus[status];
  }

  protected selectAll(): void {
    this.statusesChange.emit([]);
  }

  protected toggle(status: PaymentStatus): void {
    const current = this.statuses();
    const isOnlyActive = current.length === 1 && current[0] === status;
    this.statusesChange.emit(isOnlyActive ? [] : [status]);
  }
}
