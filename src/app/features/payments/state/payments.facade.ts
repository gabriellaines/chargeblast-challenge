import { Injectable, computed, inject } from '@angular/core';

import { PageSize, SortDirection, SortableColumn } from '../models/column-config.model';
import { PaymentFilters } from '../models/payment-filters.model';
import { PaymentsStoreService } from './payments-store.service';

@Injectable()
export class PaymentsFacade {
  private readonly store = inject(PaymentsStoreService);

  readonly payments = this.store.paginated;
  readonly filteredPayments = this.store.sorted;
  readonly totals = this.store.totals;
  readonly statusCounts = this.store.statusCounts;
  readonly totalItems = this.store.totalItems;
  readonly totalPages = this.store.totalPages;
  readonly currentPage = this.store.currentPage;
  readonly pageSize = computed(() => this.store.pagination().pageSize);
  readonly sort = this.store.sort;
  readonly filters = this.store.filters;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  updateFilters(filters: PaymentFilters): void {
    this.store.setFilters(filters);
  }

  updateSort(column: SortableColumn): void {
    const current = this.store.sort();
    const direction: SortDirection = current.column === column && current.direction === 'desc' ? 'asc' : 'desc';
    this.store.setSort({ column, direction });
  }

  goToPage(page: number): void {
    this.store.setPage(page);
  }

  changePageSize(pageSize: PageSize): void {
    this.store.setPageSize(pageSize);
  }
}
