import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { CardBrand, CurrencyCode, Payment, PaymentStatus, ZERO_DECIMAL_CURRENCIES } from '../models/payment.model';
import { PaymentRepository } from './payment-repository';

interface WeightedOption<T> {
  readonly value: T;
  readonly weight: number;
}

const SEED = 1_337;
const MIN_RECORDS = 300;
const MAX_RECORDS = 1000;
const SIMULATED_LATENCY_MS = 350;
const LOOKBACK_DAYS = 90;

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Lucas', 'Sophia', 'Mateus',
  'Isabella', 'Gabriel', 'Mia', 'Arthur', 'Amelia', 'Heitor', 'Charlotte',
  'Davi', 'Harper', 'Bernardo', 'Evelyn', 'Théo', 'Luna', 'Miguel', 'Nora',
  'Pedro', 'Chloe', 'Samuel', 'Lily', 'Rafael', 'Grace', 'Enzo'
];

const LAST_NAMES = [
  'Silva', 'Souza', 'Costa', 'Pereira', 'Oliveira', 'Santos', 'Almeida',
  'Ferreira', 'Rodrigues', 'Carvalho', 'Martins', 'Araujo', 'Barbosa',
  'Ribeiro', 'Cardoso', 'Nunes', 'Teixeira', 'Moreira', 'Correia', 'Lopes'
];

const CARD_BRANDS: readonly WeightedOption<CardBrand>[] = [
  { value: 'visa', weight: 45 },
  { value: 'mastercard', weight: 35 },
  { value: 'amex', weight: 12 },
  { value: 'discover', weight: 8 }
];

const STATUSES: readonly WeightedOption<PaymentStatus>[] = [
  { value: 'succeeded', weight: 62 },
  { value: 'pending', weight: 10 },
  { value: 'failed', weight: 12 },
  { value: 'refunded', weight: 8 },
  { value: 'disputed', weight: 4 },
  { value: 'uncaptured', weight: 4 }
];

const CURRENCIES: readonly WeightedOption<CurrencyCode>[] = [
  { value: 'USD', weight: 55 },
  { value: 'EUR', weight: 20 },
  { value: 'GBP', weight: 10 },
  { value: 'BRL', weight: 10 },
  { value: 'JPY', weight: 5 }
];

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DESCRIPTION = 'Subscription update';

const DECLINE_REASONS: readonly string[] = [
  'Insufficient funds',
  'Do not honor',
  'Transaction not allowed',
  'Card declined',
  'Expired card',
  'Incorrect CVC'
];

const REFUND_LAG_MS_MAX = 14 * 24 * 60 * 60 * 1000;

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[randomInt(rng, 0, items.length - 1)];
  if (item === undefined) {
    throw new Error('Cannot pick from an empty list');
  }
  return item;
}

function pickWeighted<T>(rng: () => number, options: readonly WeightedOption<T>[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = rng() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.value;
    }
  }
  const lastOption = options[options.length - 1];
  if (lastOption === undefined) {
    throw new Error('Cannot pick from an empty weighted list');
  }
  return lastOption.value;
}

function randomId(rng: () => number): string {
  let suffix = '';
  for (let i = 0; i < 24; i++) {
    suffix += ID_ALPHABET[randomInt(rng, 0, ID_ALPHABET.length - 1)];
  }
  return `pi_${suffix}`;
}

function randomLast4(rng: () => number): string {
  return String(randomInt(rng, 0, 9999)).padStart(4, '0');
}

function randomAmount(rng: () => number, currency: CurrencyCode): number {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return randomInt(rng, 500, 500_000);
  }
  return randomInt(rng, 100, 999_999);
}

function randomCreatedAt(rng: () => number, now: number): Date {
  const offsetMs = randomInt(rng, 0, LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return new Date(now - offsetMs);
}

function generatePayment(rng: () => number, now: number): Payment {
  const firstName = pick(rng, FIRST_NAMES);
  const lastName = pick(rng, LAST_NAMES);
  const currency = pickWeighted(rng, CURRENCIES);
  const status = pickWeighted(rng, STATUSES);
  const createdAt = randomCreatedAt(rng, now);

  const refundedAt =
    status === 'refunded' ? new Date(createdAt.getTime() + randomInt(rng, 1, REFUND_LAG_MS_MAX)) : null;
  const declineReason = status === 'failed' || status === 'disputed' ? pick(rng, DECLINE_REASONS) : null;

  return {
    id: randomId(rng),
    customerEmail: `${firstName}.${lastName}@example.com`.toLowerCase(),
    amount: randomAmount(rng, currency),
    currency,
    status,
    paymentMethod: {
      brand: pickWeighted(rng, CARD_BRANDS),
      last4: randomLast4(rng)
    },
    description: DESCRIPTION,
    createdAt,
    refundedAt,
    declineReason
  };
}

function generatePayments(): readonly Payment[] {
  const rng = createRng(SEED);
  const now = Date.now();
  const count = randomInt(rng, MIN_RECORDS, MAX_RECORDS);

  return Array.from({ length: count }, () => generatePayment(rng, now));
}

@Injectable()
export class PaymentMockRepositoryService implements PaymentRepository {
  private readonly payments: readonly Payment[] = generatePayments();

  getAll(): Observable<readonly Payment[]> {
    return of(this.payments).pipe(delay(SIMULATED_LATENCY_MS));
  }
}
