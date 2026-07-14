import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { PaymentMockRepositoryService } from './payment-mock-repository.service';

describe('PaymentMockRepositoryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PaymentMockRepositoryService] });
  });

  it('generates between 300 and 1000 payments spanning multiple currencies and statuses', async () => {
    const service = TestBed.inject(PaymentMockRepositoryService);
    const payments = await firstValueFrom(service.getAll());

    expect(payments.length).toBeGreaterThanOrEqual(300);
    expect(payments.length).toBeLessThanOrEqual(1000);

    const currencies = new Set(payments.map((payment) => payment.currency));
    const statuses = new Set(payments.map((payment) => payment.status));

    expect(currencies.size).toBeGreaterThan(1);
    expect(statuses.size).toBeGreaterThan(1);
  });
});
