import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
