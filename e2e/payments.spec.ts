import { test, expect, Page, Locator } from '@playwright/test';

async function gotoPayments(page: Page): Promise<void> {
  await page.goto('/payments');
  await page.waitForSelector('[data-testid="payment-row"]');
}

async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(200);
}

function parseAmountText(text: string): number {
  return parseFloat(text.replace(/[^0-9.]/g, ''));
}

async function getColumnValues(page: Page, attr: string): Promise<string[]> {
  return page
    .locator('[data-testid="payment-row"]')
    .evaluateAll((rows, attr) => (rows as Element[]).map((row) => row.getAttribute(attr) ?? ''), attr);
}

function isMonotonic(values: string[], numeric: boolean): 'asc' | 'desc' | null {
  const compare = numeric ? (a: string, b: string) => Number(a) - Number(b) : (a: string, b: string) => a.localeCompare(b);
  let asc = true;
  let desc = true;
  for (let i = 1; i < values.length; i++) {
    const cmp = compare(values[i - 1], values[i]);
    if (cmp > 0) asc = false;
    if (cmp < 0) desc = false;
  }
  if (asc) return 'asc';
  if (desc) return 'desc';
  return null;
}

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

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizedAmount(rawAmount: number, currency: string | null): number {
  return currency === 'JPY' ? rawAmount * 100 : rawAmount;
}

function statusTab(page: Page, label: string): Locator {
  return page.locator('.status-tabs').getByRole('button', { name: label, exact: true });
}

async function assertSearchMatches(page: Page, term: string, expectedId: string): Promise<void> {
  await page.selectOption('#payments-page-size', '100');
  await settle(page);
  const termLower = term.toLowerCase();
  let foundExpected = false;
  let totalVisited = 0;

  for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
    const rows = page.locator('[data-testid="payment-row"]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const id = (await row.getAttribute('data-id'))!;
      const email = (await row.getAttribute('data-email'))!;
      const last4 = (await row.getAttribute('data-last4'))!;
      totalVisited++;
      if (id === expectedId) {
        foundExpected = true;
      }
      const matches = id.toLowerCase().includes(termLower) || email.toLowerCase().includes(termLower) || last4.includes(term);
      expect(matches, `row ${id} does not satisfy search term "${term}"`).toBeTruthy();
    }
    if (foundExpected) break;
    const next = page.locator('.payments-table__pager button', { hasText: 'Next' });
    if (await next.isDisabled()) break;
    await next.click();
    await settle(page);
  }

  expect(totalVisited).toBeGreaterThan(0);
  expect(foundExpected, `expected row ${expectedId} to appear among search results for "${term}"`).toBeTruthy();
}

async function openChip(page: Page, label: string): Promise<Locator> {
  const chip = page.locator('.filter-chip', { has: page.locator('.filter-chip__button', { hasText: label }) });
  await chip.locator('.filter-chip__button').click();
  return chip;
}

test.describe('Req 1: Table columns', () => {
  test('renders required columns', async ({ page }) => {
    await gotoPayments(page);
    const headers = (await page.locator('.payments-table__header').allTextContents()).map((h) => h.trim());
    for (const required of ['Payment ID', 'Amount', 'Status', 'Payment Method', 'Customer', 'Date']) {
      expect(headers.some((h) => h.includes(required)), `missing column: ${required}`).toBeTruthy();
    }
  });
});

test.describe('Req 2: Payment ID truncate + copy to clipboard', () => {
  test('id text is truncated and copy button copies the full id', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const fullId = (await row.getAttribute('data-id'))!;
    const displayedText = (await row.locator('.payments-table__id-code').innerText()).trim();

    expect(displayedText.length).toBeLessThan(fullId.length);

    await row.locator('.payments-table__id-button').click();
    await expect(row.locator('.payments-table__copy-hint')).toHaveText('Copied!');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(fullId);
  });
});

test.describe('Req 3: Amount is currency-formatted', () => {
  test('USD, GBP, BRL and EUR rows show the correct currency symbol', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await settle(page);

    const currencySymbols: Record<string, string> = { USD: '$', GBP: '£', BRL: 'R$', EUR: '€' };
    const found: Record<string, boolean> = {};

    for (let pageIndex = 0; pageIndex < 6; pageIndex++) {
      const rows = page.locator('[data-testid="payment-row"]');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const currency = await row.getAttribute('data-currency');
        if (currency && currencySymbols[currency] && !found[currency]) {
          const amountCellText = await row.locator('.payments-table__cell').nth(2).innerText();
          if (amountCellText.includes(currencySymbols[currency]) && amountCellText.includes(currency)) {
            found[currency] = true;
          }
        }
      }
      if (Object.keys(found).length >= Object.keys(currencySymbols).length) break;
      const next = page.locator('.payments-table__pager button', { hasText: 'Next' });
      if (await next.isDisabled()) break;
      await next.click();
      await settle(page);
    }

    for (const currency of Object.keys(currencySymbols)) {
      expect(found[currency], `expected a correctly formatted ${currency} row`).toBeTruthy();
    }
  });
});

test.describe('Req 4: Status badge required variants', () => {
  test('Succeeded, Pending, Failed and Refunded badges all appear', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await settle(page);

    const required = ['Succeeded', 'Pending', 'Failed', 'Refunded'];
    const foundLabels = new Set<string>();

    for (let pageIndex = 0; pageIndex < 4; pageIndex++) {
      const badgeTexts = await page.locator('.badge').allTextContents();
      for (const text of badgeTexts) {
        for (const label of required) {
          if (text.includes(label)) foundLabels.add(label);
        }
      }
      if (required.every((label) => foundLabels.has(label))) break;
      const next = page.locator('.payments-table__pager button', { hasText: 'Next' });
      if (await next.isDisabled()) break;
      await next.click();
      await settle(page);
    }

    for (const label of required) {
      expect(foundLabels.has(label), `expected to find a "${label}" badge`).toBeTruthy();
    }
  });
});

test.describe('Req 5: Payment method shows brand + last4', () => {
  test('brand icon and last4 digits are shown', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const brand = await row.getAttribute('data-brand');
    const last4 = await row.getAttribute('data-last4');

    await expect(row.locator(`.payment-method__icon--${brand}`)).toBeVisible();
    const digitsText = await row.locator('.payment-method__digits').innerText();
    expect(digitsText).toContain(last4);
  });
});

test.describe('Req 6: Date column relative tooltip', () => {
  test('main text is the absolute date, tooltip carries the relative time', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const dateCell = row.locator('.payments-table__cell').nth(7);
    const visibleText = (await dateCell.innerText()).trim();
    const title = await dateCell.getAttribute('title');

    expect(visibleText).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/);
    expect(title, 'expected a title attribute').toBeTruthy();
    expect(title).not.toBe(visibleText);
  });
});

test.describe('Req 7: Sorting', () => {
  test('Date header toggles order and reverses on second click', async ({ page }) => {
    await gotoPayments(page);
    const before = await getColumnValues(page, 'data-created-at');
    await page.locator('th', { hasText: 'Date' }).click();
    await settle(page);
    const afterFirst = await getColumnValues(page, 'data-created-at');
    expect(afterFirst).not.toEqual(before);
    const firstDirection = isMonotonic(afterFirst, false);
    expect(firstDirection).not.toBeNull();

    await page.locator('th', { hasText: 'Date' }).click();
    await settle(page);
    const afterSecond = await getColumnValues(page, 'data-created-at');
    expect(afterSecond).not.toEqual(afterFirst);
    expect(isMonotonic(afterSecond, false)).toBe(firstDirection === 'asc' ? 'desc' : 'asc');
  });

  test('Amount header toggles order and reverses on second click', async ({ page }) => {
    await gotoPayments(page);
    await page.locator('th', { hasText: 'Amount' }).click();
    await settle(page);
    const afterFirst = await getColumnValues(page, 'data-amount');
    const firstDirection = isMonotonic(afterFirst, true);
    expect(firstDirection).not.toBeNull();

    await page.locator('th', { hasText: 'Amount' }).click();
    await settle(page);
    const afterSecond = await getColumnValues(page, 'data-amount');
    expect(afterSecond).not.toEqual(afterFirst);
    expect(isMonotonic(afterSecond, true)).toBe(firstDirection === 'asc' ? 'desc' : 'asc');
  });

  test('Status header toggles order and reverses on second click', async ({ page }) => {
    await gotoPayments(page);
    await page.locator('th', { hasText: 'Status' }).click();
    await settle(page);
    const afterFirst = await getColumnValues(page, 'data-status');
    const firstDirection = isMonotonic(afterFirst, false);
    expect(firstDirection).not.toBeNull();

    await page.locator('th', { hasText: 'Status' }).click();
    await settle(page);
    const afterSecond = await getColumnValues(page, 'data-status');
    expect(afterSecond).not.toEqual(afterFirst);
    expect(isMonotonic(afterSecond, false)).toBe(firstDirection === 'asc' ? 'desc' : 'asc');
  });
});

test.describe('Req 8: Pagination', () => {
  test('page size selector offers 25/50/100 and renders that many rows', async ({ page }) => {
    await gotoPayments(page);
    const options = (await page.locator('#payments-page-size option').allTextContents()).map((o) => o.trim());
    expect(options).toEqual(expect.arrayContaining(['25', '50', '100']));

    for (const size of ['25', '50', '100']) {
      await page.selectOption('#payments-page-size', size);
      await settle(page);
      const rowCount = await page.locator('[data-testid="payment-row"]').count();
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThanOrEqual(Number(size));
    }
  });

  test('next page shows different data', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '25');
    await settle(page);
    const firstIdPage1 = await page.locator('[data-testid="payment-row"]').first().getAttribute('data-id');
    await page.locator('.payments-table__pager button', { hasText: 'Next' }).click();
    await settle(page);
    const firstIdPage2 = await page.locator('[data-testid="payment-row"]').first().getAttribute('data-id');
    expect(firstIdPage2).not.toBe(firstIdPage1);
  });
});

test.describe('Req 9: Date range filter', () => {
  test('Today preset restricts results to today', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await openChip(page, 'Date and time');
    await page.locator('.payments-filters__preset-button', { hasText: 'Today' }).click();
    await settle(page);

    const now = new Date();
    const start = startOfDay(now).getTime();
    const end = endOfDay(now).getTime();
    const values = await getColumnValues(page, 'data-created-at');
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const time = new Date(value).getTime();
      expect(time).toBeGreaterThanOrEqual(start);
      expect(time).toBeLessThanOrEqual(end);
    }
  });

  test('7 days preset restricts results to the last 7 days', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await openChip(page, 'Date and time');
    await page.locator('.payments-filters__preset-button', { hasText: '7 days' }).click();
    await settle(page);

    const now = new Date();
    const start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)).getTime();
    const end = endOfDay(now).getTime();
    const values = await getColumnValues(page, 'data-created-at');
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const time = new Date(value).getTime();
      expect(time).toBeGreaterThanOrEqual(start);
      expect(time).toBeLessThanOrEqual(end);
    }
  });

  test('Custom range respects an explicit start/end window', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    const now = new Date();
    const rangeStart = startOfDay(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));
    const rangeEnd = endOfDay(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000));

    await openChip(page, 'Date and time');
    await page.locator('.payments-filters__preset-button', { hasText: 'Custom' }).click();
    await settle(page);
    const dateInputs = page.locator('.payments-filters__custom-dates input[type="date"]');
    await dateInputs.nth(0).fill(toDateInputValue(rangeStart));
    await settle(page);
    await dateInputs.nth(1).fill(toDateInputValue(rangeEnd));
    await settle(page);

    const values = await getColumnValues(page, 'data-created-at');
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const time = new Date(value).getTime();
      expect(time).toBeGreaterThanOrEqual(rangeStart.getTime());
      expect(time).toBeLessThanOrEqual(rangeEnd.getTime());
    }
  });
});

test.describe('Req 10: Status filter (multi-select)', () => {
  test('selecting only Succeeded shows only succeeded rows', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await statusTab(page, 'Succeeded').click();
    await settle(page);

    const statuses = await getColumnValues(page, 'data-status');
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((status) => status === 'succeeded')).toBeTruthy();
  });

  test('selecting Succeeded and Failed keeps both tabs highlighted and unions the results', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await statusTab(page, 'Succeeded').click();
    await settle(page);
    await statusTab(page, 'Failed').click();
    await settle(page);

    await expect(statusTab(page, 'Succeeded')).toHaveClass(/status-tabs__tab--active/);
    await expect(statusTab(page, 'Failed')).toHaveClass(/status-tabs__tab--active/);

    const statuses = await getColumnValues(page, 'data-status');
    const unique = new Set(statuses);
    expect(unique.size).toBeGreaterThan(0);
    for (const status of unique) {
      expect(['succeeded', 'failed']).toContain(status);
    }
  });
});

test.describe('Req 11: Payment method filter (multi-select)', () => {
  test('confirms implemented granularity is card brand (Visa/Mastercard/Amex/Discover), not Card/ACH/Wallet', async ({
    page
  }) => {
    await gotoPayments(page);
    const brand = await page.locator('[data-testid="payment-row"]').first().getAttribute('data-brand');
    expect(['visa', 'mastercard', 'amex', 'discover']).toContain(brand);
  });

  test('selecting Visa and Mastercard unions the results', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await openChip(page, 'Payment method');
    await page.getByRole('checkbox', { name: 'Visa' }).check();
    await settle(page);
    await page.getByRole('checkbox', { name: 'Mastercard' }).check();
    await settle(page);

    const brands = await getColumnValues(page, 'data-brand');
    expect(brands.length).toBeGreaterThan(0);
    const unique = new Set(brands);
    for (const brand of unique) {
      expect(['visa', 'mastercard']).toContain(brand);
    }
  });
});

test.describe('Req 12: Amount range filter', () => {
  test('min/max restrict the displayed amount', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await openChip(page, 'Amount');
    await page.getByPlaceholder('Min').fill('50');
    await settle(page);
    await page.getByPlaceholder('Max').fill('500');
    await settle(page);

    const rows = page.locator('[data-testid="payment-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    const violations: string[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const currency = await row.getAttribute('data-currency');
      const amountCellText = await row.locator('.payments-table__cell').nth(2).innerText();
      const displayed = parseAmountText(amountCellText);
      if (displayed < 50 || displayed > 500) {
        violations.push(`${currency} row displays ${displayed} (raw amount ${await row.getAttribute('data-amount')})`);
      }
    }
    expect(violations, `rows whose displayed amount falls outside [50, 500]:\n${violations.join('\n')}`).toEqual([]);
  });
});

test.describe('Req 13: Text search', () => {
  test('search by partial Payment ID', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const fullId = (await row.getAttribute('data-id'))!;
    const partial = fullId.slice(3, 11);
    await page.locator('.payments-filters__search').fill(partial);
    await settle(page);
    await assertSearchMatches(page, partial, fullId);
  });

  test('search by partial email', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const fullId = (await row.getAttribute('data-id'))!;
    const email = (await row.getAttribute('data-email'))!;
    const partial = email.split('@')[0];
    await page.locator('.payments-filters__search').fill(partial);
    await settle(page);
    await assertSearchMatches(page, partial, fullId);
  });

  test('search by card last4', async ({ page }) => {
    await gotoPayments(page);
    const row = page.locator('[data-testid="payment-row"]').first();
    const fullId = (await row.getAttribute('data-id'))!;
    const last4 = (await row.getAttribute('data-last4'))!;
    await page.locator('.payments-filters__search').fill(last4);
    await settle(page);
    await assertSearchMatches(page, last4, fullId);
  });
});

test.describe('Req 14: Combined filters', () => {
  test('Status=Succeeded + Payment method=Visa + Amount min=10 combine with AND', async ({ page }) => {
    await gotoPayments(page);
    await page.selectOption('#payments-page-size', '100');
    await statusTab(page, 'Succeeded').click();
    await settle(page);
    await openChip(page, 'Payment method');
    await page.getByRole('checkbox', { name: 'Visa' }).check();
    await settle(page);
    await openChip(page, 'Amount');
    await page.getByPlaceholder('Min').fill('10');
    await settle(page);

    const rows = page.locator('[data-testid="payment-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      expect(await row.getAttribute('data-status')).toBe('succeeded');
      expect(await row.getAttribute('data-brand')).toBe('visa');
      const currency = await row.getAttribute('data-currency');
      const rawAmount = Number(await row.getAttribute('data-amount'));
      expect(normalizedAmount(rawAmount, currency)).toBeGreaterThanOrEqual(1000);
    }
  });

  test('resetting filters (reload) restores the full unfiltered dataset', async ({ page }) => {
    await gotoPayments(page);
    const fullCountText = await page.locator('.payments-toolbar__count').innerText();

    await statusTab(page, 'Succeeded').click();
    await settle(page);
    const filteredCountText = await page.locator('.payments-toolbar__count').innerText();
    expect(filteredCountText).not.toBe(fullCountText);

    await page.reload();
    await page.waitForSelector('[data-testid="payment-row"]');
    const resetCountText = await page.locator('.payments-toolbar__count').innerText();
    expect(resetCountText).toBe(fullCountText);
  });
});
