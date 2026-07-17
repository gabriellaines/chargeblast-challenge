import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'disputed' | 'uncaptured';

type StatusIcon = 'check' | 'cross' | 'dot' | 'bang';

interface StatusVisual {
  readonly label: string;
  readonly modifier: string;
  readonly icon: StatusIcon;
}

const STATUS_VISUALS: Readonly<Record<StatusBadgeStatus, StatusVisual>> = {
  succeeded: { label: 'Succeeded', modifier: 'success', icon: 'check' },
  pending: { label: 'Pending', modifier: 'pending', icon: 'dot' },
  failed: { label: 'Failed', modifier: 'failed', icon: 'cross' },
  refunded: { label: 'Refunded', modifier: 'refunded', icon: 'dot' },
  disputed: { label: 'Disputed', modifier: 'disputed', icon: 'bang' },
  uncaptured: { label: 'Uncaptured', modifier: 'uncaptured', icon: 'dot' }
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
