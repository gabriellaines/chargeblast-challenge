import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-filter-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-chip.component.html',
  styleUrl: './filter-chip.component.scss'
})
export class FilterChipComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly label = input.required<string>();
  readonly hasMenu = input<boolean>(false);
  readonly opened = output<void>();

  protected readonly open = signal(false);

  protected toggle(): void {
    if (!this.hasMenu()) {
      return;
    }
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.opened.emit();
    }
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
