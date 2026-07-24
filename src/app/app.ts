import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppNav } from './components/layout/app-nav/app-nav';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AppNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly settingsService = inject(SettingsService);
  readonly displayTitle = this.settingsService.displayTitle;
}
