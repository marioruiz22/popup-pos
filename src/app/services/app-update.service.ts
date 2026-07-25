import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { APP_VERSION_INFO } from '../version';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);

  private readonly updateReady = signal(false);
  private readonly checking = signal(false);
  private readonly status = signal<string | null>(null);

  readonly versionLabel = computed(() => {
    const { version, buildNumber } = APP_VERSION_INFO;
    if (buildNumber === 'dev') {
      return `${version}-dev`;
    }
    return `${version}+${buildNumber}`;
  });

  readonly builtAtLabel = computed(() => {
    const builtAt = new Date(APP_VERSION_INFO.builtAt);
    if (Number.isNaN(builtAt.getTime()) || builtAt.getTime() === 0) {
      return 'Local development';
    }
    return builtAt.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  readonly buildNumber = computed(() => APP_VERSION_INFO.buildNumber);
  readonly updateAvailable = computed(() => this.updateReady());
  readonly isChecking = computed(() => this.checking());
  readonly statusMessage = computed(() => this.status());
  readonly updatesSupported = computed(() => this.swUpdate.isEnabled && !isDevMode());

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReady.set(true);
        this.status.set('A new version is ready to install.');
      }
      if (event.type === 'VERSION_INSTALLATION_FAILED') {
        this.status.set('Update download failed. Try again.');
      }
    });
  }

  async checkForUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      this.status.set('Update checks work on the deployed app (not during local ng serve).');
      return;
    }

    this.checking.set(true);
    this.status.set('Checking for updates…');

    try {
      const found = await this.swUpdate.checkForUpdate();
      if (found || this.updateReady()) {
        this.updateReady.set(true);
        this.status.set('A new version is ready to install.');
      } else {
        this.status.set('You are on the latest version.');
      }
    } catch {
      this.status.set('Could not check for updates. Check your connection and try again.');
    } finally {
      this.checking.set(false);
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch {
      this.status.set('Could not install the update. Try refreshing the page.');
    }
  }
}
