import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'disputed' | 'uncaptured';

interface StatusVisual {
  readonly label: string;
  readonly modifier: string;
  readonly icon: string;
}

const STATUS_VISUALS: Readonly<Record<StatusBadgeStatus, StatusVisual>> = {
  succeeded: { label: 'Succeeded', modifier: 'success', icon: '✓' },
  pending: { label: 'Pending', modifier: 'pending', icon: '•' },
  failed: { label: 'Failed', modifier: 'failed', icon: '✗' },
  refunded: { label: 'Refunded', modifier: 'refunded', icon: '•' },
  disputed: { label: 'Disputed', modifier: 'disputed', icon: '!' },
  uncaptured: { label: 'Uncaptured', modifier: 'uncaptured', icon: '•' }
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  readonly status = input.required<StatusBadgeStatus>();

  protected readonly visual = computed(() => STATUS_VISUALS[this.status()]);
}
