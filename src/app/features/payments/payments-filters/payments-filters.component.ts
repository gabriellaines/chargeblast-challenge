import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { FilterChipComponent } from './filter-chip/filter-chip.component';
import { PaymentStatusTabsComponent } from './payment-status-tabs/payment-status-tabs.component';
import { AmountRangeFilter, DateRangeFilter, DateRangePreset, PaymentFilters } from '../models/payment-filters.model';
import { CardBrand, PaymentStatus } from '../models/payment.model';

interface PresetOption {
  readonly value: DateRangePreset;
  readonly label: string;
}

const DATE_PRESETS: readonly PresetOption[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' }
];

const STATUS_OPTIONS: readonly PaymentStatus[] = ['succeeded', 'pending', 'failed', 'refunded', 'disputed', 'uncaptured'];
const STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = {
  succeeded: 'Succeeded',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  disputed: 'Disputed',
  uncaptured: 'Uncaptured'
};

const BRAND_OPTIONS: readonly CardBrand[] = ['visa', 'mastercard', 'amex', 'discover'];
const BRAND_LABELS: Readonly<Record<CardBrand, string>> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover'
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function resolvePresetRange(preset: 'today' | '7d' | '30d'): DateRangeFilter {
  const now = new Date();
  const daysBack = preset === 'today' ? 0 : preset === '7d' ? 6 : 29;
  const start = startOfDay(new Date(now.getTime() - daysBack * MS_PER_DAY));
  return { preset, start, end: endOfDay(now) };
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string, boundary: 'start' | 'end'): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return boundary === 'start' ? startOfDay(date) : endOfDay(date);
}

@Component({
  selector: 'app-payments-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterChipComponent, PaymentStatusTabsComponent],
  templateUrl: './payments-filters.component.html',
  styleUrl: './payments-filters.component.scss'
})
export class PaymentsFiltersComponent {
  readonly filters = input.required<PaymentFilters>();
  readonly filtersChange = output<PaymentFilters>();
  readonly exportRequested = output<void>();
  readonly editColumnsRequested = output<void>();

  protected readonly datePresets = DATE_PRESETS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly brandOptions = BRAND_OPTIONS;
  protected readonly brandLabels = BRAND_LABELS;

  protected readonly activePreset = computed<DateRangePreset | null>(() => this.filters().dateRange?.preset ?? null);

  protected readonly customStart = computed(() => {
    const range = this.filters().dateRange;
    return toDateInputValue(range?.start ?? new Date());
  });

  protected readonly customEnd = computed(() => {
    const range = this.filters().dateRange;
    return toDateInputValue(range?.end ?? new Date());
  });

  protected readonly minAmountInput = computed(() => {
    const { min } = this.filters().amountRange;
    return min === null ? '' : String(min / 100);
  });

  protected readonly maxAmountInput = computed(() => {
    const { max } = this.filters().amountRange;
    return max === null ? '' : String(max / 100);
  });

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.emit({ ...this.filters(), search: value });
  }

  protected onStatusesChange(statuses: readonly PaymentStatus[]): void {
    this.emit({ ...this.filters(), statuses });
  }

  protected onToggleStatus(status: PaymentStatus): void {
    const current = this.filters().statuses;
    const next = current.includes(status) ? current.filter((value) => value !== status) : [...current, status];
    this.emit({ ...this.filters(), statuses: next });
  }

  protected onToggleBrand(brand: CardBrand): void {
    const current = this.filters().paymentMethods;
    const next = current.includes(brand) ? current.filter((value) => value !== brand) : [...current, brand];
    this.emit({ ...this.filters(), paymentMethods: next });
  }

  protected onPresetSelect(preset: DateRangePreset): void {
    if (preset === 'custom') {
      const now = new Date();
      this.emit({ ...this.filters(), dateRange: { preset: 'custom', start: startOfDay(now), end: endOfDay(now) } });
      return;
    }
    this.emit({ ...this.filters(), dateRange: resolvePresetRange(preset) });
  }

  protected onClearDateRange(): void {
    this.emit({ ...this.filters(), dateRange: null });
  }

  protected onCustomDateChange(boundary: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      return;
    }
    const current = this.filters().dateRange;
    const start = boundary === 'start' ? fromDateInputValue(value, 'start') : (current?.start ?? startOfDay(new Date()));
    const end = boundary === 'end' ? fromDateInputValue(value, 'end') : (current?.end ?? endOfDay(new Date()));
    this.emit({ ...this.filters(), dateRange: { preset: 'custom', start, end } });
  }

  protected onAmountChange(boundary: 'min' | 'max', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Math.round(Number(raw) * 100);
    const amountRange: AmountRangeFilter = { ...this.filters().amountRange, [boundary]: value };
    this.emit({ ...this.filters(), amountRange });
  }

  private emit(filters: PaymentFilters): void {
    this.filtersChange.emit(filters);
  }
}
