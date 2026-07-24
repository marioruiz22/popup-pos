import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'popup-pos-settings';
const DEFAULT_TITLE = 'Popup POS';

export interface AppSettings {
  popupName: string;
  deviceName: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly settings = signal<AppSettings>({
    popupName: '',
    deviceName: '',
  });

  readonly displayTitle = computed(() => this.settings().popupName.trim() || DEFAULT_TITLE);

  constructor() {
    this.load();
  }

  getPopupName(): string {
    return this.settings().popupName;
  }

  getDeviceName(): string {
    return this.settings().deviceName;
  }

  /**
   * Device name is stamped onto completed orders at complete time.
   * TODO(firebase): Optionally sync settings / device identity with a devices collection.
   */

  getDisplayTitle(): string {
    return this.displayTitle();
  }

  getDefaultTitle(): string {
    return DEFAULT_TITLE;
  }

  updateSettings(input: Partial<AppSettings>): void {
    const current = this.settings();
    this.settings.set({
      popupName: input.popupName !== undefined ? input.popupName.trim() : current.popupName,
      deviceName: input.deviceName !== undefined ? input.deviceName.trim() : current.deviceName,
    });
    this.save();
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw) as Partial<AppSettings>;
      this.settings.set({
        popupName: typeof data.popupName === 'string' ? data.popupName.trim() : '',
        deviceName: typeof data.deviceName === 'string' ? data.deviceName.trim() : '',
      });
    } catch {
      // Keep defaults when stored data is invalid.
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings()));
  }
}
