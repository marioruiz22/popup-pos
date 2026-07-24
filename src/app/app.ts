import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppNav } from './components/layout/app-nav/app-nav';
import { PopupSessionService } from './services/popup-session.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AppNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly settingsService = inject(SettingsService);
  private readonly popupSession = inject(PopupSessionService);

  readonly displayTitle = this.settingsService.displayTitle;
  readonly isJoined = this.popupSession.isJoined;
}
