import { CardBrand, CurrencyCode, PaymentStatus } from './payment.model';

export type DateRangePreset = 'today' | '7d' | '30d' | 'custom';

export interface DateRangeFilter {
  readonly preset: DateRangePreset;
  readonly start: Date;
  readonly end: Date;
}

export interface AmountRangeFilter {
  readonly min: number | null;
  readonly max: number | null;
}

export interface PaymentFilters {
  readonly dateRange: DateRangeFilter | null;
  readonly statuses: readonly PaymentStatus[];
  readonly paymentMethods: readonly CardBrand[];
  readonly amountRange: AmountRangeFilter;
  readonly currency: CurrencyCode | null;
  readonly search: string;
}

export const DEFAULT_PAYMENT_FILTERS: PaymentFilters = {
  dateRange: null,
  statuses: [],
  paymentMethods: [],
  amountRange: { min: null, max: null },
  currency: null,
  search: ''
};
