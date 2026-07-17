export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'disputed' | 'uncaptured';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'BRL' | 'JPY';

export const ZERO_DECIMAL_CURRENCIES: readonly CurrencyCode[] = ['JPY'];

export function toDecimalAmount(amount: number, currency: CurrencyCode): number {
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? amount : amount / 100;
}

export interface PaymentMethodInfo {
  readonly brand: CardBrand;
  readonly last4: string;
}

export interface Payment {
  readonly id: string;
  readonly customerEmail: string;
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly status: PaymentStatus;
  readonly paymentMethod: PaymentMethodInfo;
  readonly description: string;
  readonly createdAt: Date;
  readonly refundedAt: Date | null;
  readonly declineReason: string | null;
}
