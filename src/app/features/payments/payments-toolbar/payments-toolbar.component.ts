import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-payments-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments-toolbar.component.html',
  styleUrl: './payments-toolbar.component.scss'
})
export class PaymentsToolbarComponent {
  readonly totalItems = input<number>(0);
}
