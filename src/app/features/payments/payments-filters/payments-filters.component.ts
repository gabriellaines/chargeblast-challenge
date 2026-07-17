import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FilterChipComponent } from './filter-chip/filter-chip.component';
import { PaymentStatusTabsComponent } from './payment-status-tabs/payment-status-tabs.component';
import { AmountRangeFilter, DateRangeFilter, DateRangePreset, PaymentFilters } from '../models/payment-filters.model';
import { CardBrand, CurrencyCode, PaymentStatus } from '../models/payment.model';
import { PaymentsTotals } from '../state/payments-store.service';
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';

type AmountOperator = 'equal' | 'between' | 'greater' | 'less';

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

const CURRENCY_OPTIONS: readonly CurrencyCode[] = ['USD', 'EUR', 'GBP', 'BRL', 'JPY'];

const BRAND_OPTIONS: readonly CardBrand[] = ['visa', 'mastercard', 'amex', 'discover'];
const BRAND_LABELS: Readonly<Record<CardBrand, string>> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover'
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date, useUtc = false): Date {
  if (useUtc) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date, useUtc = false): Date {
  if (useUtc) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  }
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function resolvePresetRange(preset: 'today' | '7d' | '30d', useUtc: boolean): DateRangeFilter {
  const now = new Date();
  const daysBack = preset === 'today' ? 0 : preset === '7d' ? 6 : 29;
  const rangeStart = new Date(now.getTime() - daysBack * MS_PER_DAY);
  return { preset, start: startOfDay(rangeStart, useUtc), end: endOfDay(now, useUtc) };
}

function toggleInList<T>(list: readonly T[], value: T): readonly T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
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

function localTimezoneLabel(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = zone.split('/').pop() ?? zone;
  return `${city.replace(/_/g, ' ')} Time`;
}

@Component({
  selector: 'app-payments-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterChipComponent, PaymentStatusTabsComponent, CheckboxComponent],
  templateUrl: './payments-filters.component.html',
  styleUrl: './payments-filters.component.scss'
})
export class PaymentsFiltersComponent {
  readonly filters = input.required<PaymentFilters>();
  readonly statusCounts = input.required<PaymentsTotals>();
  readonly filtersChange = output<PaymentFilters>();
  readonly exportRequested = output<void>();
  readonly editColumnsRequested = output<void>();

  protected readonly datePresets = DATE_PRESETS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly brandOptions = BRAND_OPTIONS;
  protected readonly brandLabels = BRAND_LABELS;
  protected readonly localTimezoneLabel = localTimezoneLabel();

  protected readonly dateTimezone = signal<'local' | 'utc'>('local');

  protected readonly activePreset = computed<DateRangePreset | null>(() => this.filters().dateRange?.preset ?? null);

  protected readonly customStart = computed(() => {
    const range = this.filters().dateRange;
    return toDateInputValue(range?.start ?? new Date());
  });

  protected readonly customEnd = computed(() => {
    const range = this.filters().dateRange;
    return toDateInputValue(range?.end ?? new Date());
  });

  protected readonly amountOperator = signal<AmountOperator>('equal');
  protected readonly amountValue1 = signal('');
  protected readonly amountValue2 = signal('');

  protected readonly pendingCurrency = signal<CurrencyCode | ''>('');

  protected readonly pendingStatuses = signal<readonly PaymentStatus[]>([]);

  protected readonly pendingPaymentMethods = signal<readonly CardBrand[]>([]);

  protected readonly moreFilterOptions = [
    'Customer ID',
    'Invoice',
    'Decline reason',
    'Email',
    'Card brand',
    'Last 4 digits',
    'Dispute amount',
    'Disputed on',
    'Dispute reason',
    'Evidence due by',
    'Evidence submitted at'
  ] as const;

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.emit({ ...this.filters(), search: value });
  }

  protected onStatusesChange(statuses: readonly PaymentStatus[]): void {
    this.emit({ ...this.filters(), statuses });
  }

  protected setDateTimezone(zone: 'local' | 'utc'): void {
    this.dateTimezone.set(zone);
  }

  protected onPresetSelect(preset: DateRangePreset, chip: FilterChipComponent): void {
    if (preset === 'custom') {
      const now = new Date();
      this.emit({ ...this.filters(), dateRange: { preset: 'custom', start: startOfDay(now), end: endOfDay(now) } });
      return;
    }
    this.emit({ ...this.filters(), dateRange: resolvePresetRange(preset, this.dateTimezone() === 'utc') });
    chip.close();
  }

  protected onClearDateRange(chip: FilterChipComponent): void {
    this.emit({ ...this.filters(), dateRange: null });
    chip.close();
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

  protected resetAmountMenu(): void {
    this.amountOperator.set('equal');
    this.amountValue1.set('');
    this.amountValue2.set('');
  }

  protected onAmountOperatorSelect(event: Event): void {
    this.amountOperator.set((event.target as HTMLSelectElement).value as AmountOperator);
  }

  protected onAmountValueInput(slot: 1 | 2, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (slot === 1) {
      this.amountValue1.set(value);
    } else {
      this.amountValue2.set(value);
    }
  }

  protected applyAmountFilter(chip: FilterChipComponent): void {
    const value1 = this.amountValue1() === '' ? null : Math.round(Number(this.amountValue1()) * 100);
    const value2 = this.amountValue2() === '' ? null : Math.round(Number(this.amountValue2()) * 100);
    if (value1 === null) {
      return;
    }
    let amountRange: AmountRangeFilter;
    switch (this.amountOperator()) {
      case 'equal':
        amountRange = { min: value1, max: value1 };
        break;
      case 'between':
        amountRange = { min: value1, max: value2 };
        break;
      case 'greater':
        amountRange = { min: value1, max: null };
        break;
      case 'less':
        amountRange = { min: null, max: value1 };
        break;
    }
    this.emit({ ...this.filters(), amountRange });
    chip.close();
  }

  protected resetCurrencyMenu(): void {
    this.pendingCurrency.set(this.filters().currency ?? '');
  }

  protected onCurrencySelect(event: Event): void {
    this.pendingCurrency.set((event.target as HTMLSelectElement).value as CurrencyCode | '');
  }

  protected applyCurrencyFilter(chip: FilterChipComponent): void {
    const value = this.pendingCurrency();
    this.emit({ ...this.filters(), currency: value === '' ? null : value });
    chip.close();
  }

  protected resetStatusMenu(): void {
    this.pendingStatuses.set(this.filters().statuses);
  }

  protected toggleStatusPending(status: PaymentStatus): void {
    this.pendingStatuses.update((current) => toggleInList(current, status));
  }

  protected applyStatusFilter(chip: FilterChipComponent): void {
    this.emit({ ...this.filters(), statuses: this.pendingStatuses() });
    chip.close();
  }

  protected resetPaymentMethodMenu(): void {
    this.pendingPaymentMethods.set(this.filters().paymentMethods);
  }

  protected togglePaymentMethodPending(brand: CardBrand): void {
    this.pendingPaymentMethods.update((current) => toggleInList(current, brand));
  }

  protected applyPaymentMethodFilter(chip: FilterChipComponent): void {
    this.emit({ ...this.filters(), paymentMethods: this.pendingPaymentMethods() });
    chip.close();
  }

  private emit(filters: PaymentFilters): void {
    this.filtersChange.emit(filters);
  }
}
