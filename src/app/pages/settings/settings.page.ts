import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PopupSessionService } from '../../services/popup-session.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly popupSession = inject(PopupSessionService);
  private readonly router = inject(Router);

  popupName = '';
  deviceName = '';
  savedMessage = '';

  constructor() {
    this.popupName = this.settingsService.getPopupName();
    this.deviceName = this.settingsService.getDeviceName();
  }

  get defaultTitle(): string {
    return this.settingsService.getDefaultTitle();
  }

  get joinCode(): string | null {
    return this.popupSession.getJoinCode();
  }

  get sessionPopupName(): string | null {
    return this.popupSession.getPopupName();
  }

  save(): void {
    this.settingsService.updateSettings({
      popupName: this.popupName,
      deviceName: this.deviceName,
    });
    this.popupName = this.settingsService.getPopupName();
    this.deviceName = this.settingsService.getDeviceName();
    this.savedMessage = 'Settings saved';
  }

  leavePopup(): void {
    const confirmed = confirm(
      'Leave this popup on this device? You will need the join code to unlock the app again.'
    );
    if (!confirmed) {
      return;
    }

    this.popupSession.leavePopup();
    void this.router.navigateByUrl('/join');
  }
}
