import { Payment, toDecimalAmount } from '../models/payment.model';

const CSV_HEADER = [
  'Payment ID',
  'Amount',
  'Currency',
  'Status',
  'Card Brand',
  'Last 4',
  'Description',
  'Customer Email',
  'Date',
  'Refunded Date',
  'Decline Reason'
];

function formatAmount(amount: number, currency: Payment['currency']): string {
  return toDecimalAmount(amount, currency).toFixed(2);
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function paymentToRow(payment: Payment): readonly string[] {
  return [
    payment.id,
    formatAmount(payment.amount, payment.currency),
    payment.currency,
    payment.status,
    payment.paymentMethod.brand,
    payment.paymentMethod.last4,
    payment.description,
    payment.customerEmail,
    payment.createdAt.toISOString(),
    payment.refundedAt?.toISOString() ?? '',
    payment.declineReason ?? ''
  ];
}

export function paymentsToCsv(payments: readonly Payment[]): string {
  const rows = [CSV_HEADER, ...payments.map(paymentToRow)];
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}
