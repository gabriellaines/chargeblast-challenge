import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { PaymentMethodBadgeComponent } from '../../../shared/components/payment-method-badge/payment-method-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { ColumnConfig, PAGE_SIZE_OPTIONS, PageSize, SortState, SortableColumn } from '../models/column-config.model';
import { Payment } from '../models/payment.model';
import { PaymentAmountPipe } from './payment-amount.pipe';

const COLUMNS: readonly ColumnConfig[] = [
  { key: 'id', label: 'Payment ID', sortable: false },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'paymentMethod', label: 'Payment Method', sortable: false },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'customerEmail', label: 'Customer', sortable: true },
  { key: 'createdAt', label: 'Date', sortable: true }
];

const COPY_FEEDBACK_MS = 1500;
const ID_TRUNCATE_HEAD = 10;
const ID_TRUNCATE_TAIL = 4;

@Component({
  selector: 'app-payments-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RelativeTimePipe, PaymentAmountPipe, StatusBadgeComponent, PaymentMethodBadgeComponent],
  templateUrl: './payments-table.component.html',
  styleUrl: './payments-table.component.scss'
})
export class PaymentsTableComponent {
  readonly payments = input.required<readonly Payment[]>();
  readonly sort = input.required<SortState>();
  readonly loading = input<boolean>(false);
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly pageSize = input.required<PageSize>();

  readonly sortChange = output<SortableColumn>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<PageSize>();

  protected readonly columns = COLUMNS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly copiedId = signal<string | null>(null);

  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly allSelected = computed(() => {
    const items = this.payments();
    return items.length > 0 && items.every((payment) => this.selectedIds().has(payment.id));
  });

  protected readonly rangeStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  protected readonly rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalItems()));

  protected onPageSizeSelect(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value) as PageSize;
    this.pageSizeChange.emit(value);
  }

  protected goToPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  protected goToNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  protected onSort(column: ColumnConfig): void {
    if (!column.sortable) {
      return;
    }
    this.sortChange.emit(column.key as SortableColumn);
  }

  protected sortIndicator(column: ColumnConfig): 'asc' | 'desc' | null {
    if (!column.sortable || this.sort().column !== column.key) {
      return null;
    }
    return this.sort().direction;
  }

  protected truncateId(id: string): string {
    if (id.length <= ID_TRUNCATE_HEAD + ID_TRUNCATE_TAIL + 1) {
      return id;
    }
    return `${id.slice(0, ID_TRUNCATE_HEAD)}…${id.slice(-ID_TRUNCATE_TAIL)}`;
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.payments().map((payment) => payment.id)));
  }

  protected toggleRow(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  protected async copyId(id: string): Promise<void> {
    await navigator.clipboard.writeText(id);
    this.copiedId.set(id);
    setTimeout(() => {
      if (this.copiedId() === id) {
        this.copiedId.set(null);
      }
    }, COPY_FEEDBACK_MS);
  }
}
