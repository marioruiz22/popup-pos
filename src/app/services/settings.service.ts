import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'popup-pos-settings';
const DEFAULT_TITLE = 'Popup POS';

export interface AppSettings {
  popupName: string;
  deviceName: string;
  darkMode: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly settings = signal<AppSettings>({
    popupName: '',
    deviceName: '',
    darkMode: false,
  });

  readonly displayTitle = computed(() => this.settings().popupName.trim() || DEFAULT_TITLE);
  readonly darkMode = computed(() => this.settings().darkMode);

  constructor() {
    this.load();
    this.applyTheme(this.settings().darkMode);
  }

  getPopupName(): string {
    return this.settings().popupName;
  }

  getDeviceName(): string {
    return this.settings().deviceName;
  }

  isDarkMode(): boolean {
    return this.settings().darkMode;
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

  setDarkMode(enabled: boolean): void {
    const current = this.settings();
    if (current.darkMode === enabled) {
      return;
    }

    this.settings.set({ ...current, darkMode: enabled });
    this.applyTheme(enabled);
    this.save();
  }

  updateSettings(input: Partial<AppSettings>): void {
    const current = this.settings();
    const next: AppSettings = {
      popupName: input.popupName !== undefined ? input.popupName.trim() : current.popupName,
      deviceName: input.deviceName !== undefined ? input.deviceName.trim() : current.deviceName,
      darkMode: input.darkMode !== undefined ? input.darkMode : current.darkMode,
    };
    this.settings.set(next);
    this.applyTheme(next.darkMode);
    this.save();
  }

  private applyTheme(darkMode: boolean): void {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', darkMode ? '#0f0f12' : '#8b5cf6');
    }
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
        darkMode: data.darkMode === true,
      });
    } catch {
      // Keep defaults when stored data is invalid.
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings()));
  }
}
