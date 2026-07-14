import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PaymentStatus } from '../../models/payment.model';

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
  readonly statusesChange = output<readonly PaymentStatus[]>();

  protected readonly tabs = STATUS_TABS;

  protected isActive(status: PaymentStatus): boolean {
    return this.statuses().includes(status);
  }

  protected selectAll(): void {
    this.statusesChange.emit([]);
  }

  protected toggle(status: PaymentStatus): void {
    const current = this.statuses();
    const next = current.includes(status) ? current.filter((value) => value !== status) : [...current, status];
    this.statusesChange.emit(next);
  }
}
