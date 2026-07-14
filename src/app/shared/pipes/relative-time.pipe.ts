import { Pipe, PipeTransform } from '@angular/core';

interface RelativeDivision {
  readonly amount: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

const DIVISIONS: readonly RelativeDivision[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' }
];

const ABSOLUTE_FALLBACK_DAYS = 30;

@Pipe({
  name: 'relativeTime'
})
export class RelativeTimePipe implements PipeTransform {
  private readonly relativeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  private readonly absoluteFormatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  transform(value: Date): string {
    const diffMs = value.getTime() - Date.now();
    const diffDays = Math.abs(diffMs) / (1000 * 60 * 60 * 24);

    if (diffDays > ABSOLUTE_FALLBACK_DAYS) {
      return this.absoluteFormatter.format(value);
    }

    let duration = diffMs / 1000;
    for (const division of DIVISIONS) {
      if (Math.abs(duration) < division.amount) {
        return this.relativeFormatter.format(Math.round(duration), division.unit);
      }
      duration /= division.amount;
    }

    return this.absoluteFormatter.format(value);
  }
}
