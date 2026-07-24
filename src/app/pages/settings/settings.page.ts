import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  popupName = '';
  deviceName = '';
  savedMessage = '';

  constructor(private settingsService: SettingsService) {
    this.popupName = this.settingsService.getPopupName();
    this.deviceName = this.settingsService.getDeviceName();
  }

  get defaultTitle(): string {
    return this.settingsService.getDefaultTitle();
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
}
