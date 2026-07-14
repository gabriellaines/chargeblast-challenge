import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardBrandVisual = 'visa' | 'mastercard' | 'amex' | 'discover';

const BRAND_LABELS: Readonly<Record<CardBrandVisual, string>> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover'
};

@Component({
  selector: 'app-payment-method-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-method-badge.component.html',
  styleUrl: './payment-method-badge.component.scss'
})
export class PaymentMethodBadgeComponent {
  readonly brand = input.required<CardBrandVisual>();
  readonly last4 = input.required<string>();

  protected readonly brandLabel = computed(() => BRAND_LABELS[this.brand()]);
}
