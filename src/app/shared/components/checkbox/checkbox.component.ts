import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class CheckboxComponent {
  readonly checked = input<boolean>(false);
  readonly ariaLabel = input.required<string>();
  readonly checkedChange = output<boolean>();

  protected onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
