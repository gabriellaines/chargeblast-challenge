import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PAYMENT_REPOSITORY } from '../data-access/payment-repository';
import { PaginationState, PageSize, SortState } from '../models/column-config.model';
import { DEFAULT_PAYMENT_FILTERS, PaymentFilters } from '../models/payment-filters.model';
import { Payment, PaymentStatus, ZERO_DECIMAL_CURRENCIES } from '../models/payment.model';

export interface PaymentsTotals {
  readonly count: number;
  readonly byStatus: Readonly<Record<PaymentStatus, number>>;
}

const DEFAULT_SORT: SortState = { column: 'createdAt', direction: 'desc' };
const DEFAULT_PAGINATION: PaginationState = { page: 1, pageSize: 25 };

function matchesDateRange(payment: Payment, filters: PaymentFilters): boolean {
  if (!filters.dateRange) {
    return true;
  }
  const time = payment.createdAt.getTime();
  return time >= filters.dateRange.start.getTime() && time <= filters.dateRange.end.getTime();
}

function normalizedAmount(payment: Payment): number {
  return ZERO_DECIMAL_CURRENCIES.includes(payment.currency) ? payment.amount * 100 : payment.amount;
}

function matchesAmountRange(payment: Payment, filters: PaymentFilters): boolean {
  const { min, max } = filters.amountRange;
  const value = normalizedAmount(payment);
  if (min !== null && value < min) {
    return false;
  }
  if (max !== null && value > max) {
    return false;
  }
  return true;
}

function matchesSearch(payment: Payment, search: string): boolean {
  if (!search) {
    return true;
  }
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }
  return (
    payment.id.toLowerCase().includes(term) ||
    payment.customerEmail.toLowerCase().includes(term) ||
    payment.paymentMethod.last4.includes(term)
  );
}

function filterPayments(payments: readonly Payment[], filters: PaymentFilters): readonly Payment[] {
  return payments.filter(
    (payment) =>
      matchesDateRange(payment, filters) &&
      (filters.statuses.length === 0 || filters.statuses.includes(payment.status)) &&
      (filters.paymentMethods.length === 0 || filters.paymentMethods.includes(payment.paymentMethod.brand)) &&
      matchesAmountRange(payment, filters) &&
      matchesSearch(payment, filters.search)
  );
}

function compareBy(sort: SortState, a: Payment, b: Payment): number {
  const direction = sort.direction === 'asc' ? 1 : -1;
  switch (sort.column) {
    case 'createdAt':
      return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
    case 'amount':
      return (a.amount - b.amount) * direction;
    case 'status':
      return a.status.localeCompare(b.status) * direction;
    case 'customerEmail':
      return a.customerEmail.localeCompare(b.customerEmail) * direction;
  }
}

function sortPayments(payments: readonly Payment[], sort: SortState): readonly Payment[] {
  return [...payments].sort((a, b) => compareBy(sort, a, b));
}

function summarizeTotals(payments: readonly Payment[]): PaymentsTotals {
  const byStatus: Record<PaymentStatus, number> = {
    succeeded: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
    disputed: 0,
    uncaptured: 0
  };
  for (const payment of payments) {
    byStatus[payment.status]++;
  }
  return { count: payments.length, byStatus };
}

@Injectable()
export class PaymentsStoreService {
  private readonly repository = inject(PAYMENT_REPOSITORY);

  private readonly _allPayments = signal<readonly Payment[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<PaymentFilters>(DEFAULT_PAYMENT_FILTERS);
  private readonly _sort = signal<SortState>(DEFAULT_SORT);
  private readonly _pagination = signal<PaginationState>(DEFAULT_PAGINATION);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly sort = this._sort.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  readonly filtered = computed(() => filterPayments(this._allPayments(), this._filters()));
  readonly sorted = computed(() => sortPayments(this.filtered(), this._sort()));
  readonly totalItems = computed(() => this.filtered().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this._pagination().pageSize)));
  readonly currentPage = computed(() => Math.min(this._pagination().page, this.totalPages()));

  readonly paginated = computed(() => {
    const pageSize = this._pagination().pageSize;
    const start = (this.currentPage() - 1) * pageSize;
    return this.sorted().slice(start, start + pageSize);
  });

  readonly totals = computed(() => summarizeTotals(this.filtered()));

  constructor() {
    this.repository
      .getAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (payments) => {
          this._allPayments.set(payments);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Não foi possível carregar os pagamentos.');
          this._loading.set(false);
        }
      });
  }

  setFilters(filters: PaymentFilters): void {
    this._filters.set(filters);
    this._pagination.update((pagination) => ({ ...pagination, page: 1 }));
  }

  setSort(sort: SortState): void {
    this._sort.set(sort);
    this._pagination.update((pagination) => ({ ...pagination, page: 1 }));
  }

  setPage(page: number): void {
    this._pagination.update((pagination) => ({ ...pagination, page }));
  }

  setPageSize(pageSize: PageSize): void {
    this._pagination.set({ page: 1, pageSize });
  }
}
