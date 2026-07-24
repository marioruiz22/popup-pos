import { Injectable, computed, signal } from '@angular/core';
import { KNOWN_POPUPS } from '../data/known-popups';
import { PopupDefinition } from '../models/popup';
import { PopupSession } from '../models/popup-session';

const STORAGE_KEY = 'popup-pos-popup-session';

/**
 * Current popup/event context for this device.
 *
 * Invitation model: users may only join popups that already exist in the registry.
 * Unknown codes are rejected — join never creates a popup.
 */
@Injectable({
  providedIn: 'root',
})
export class PopupSessionService {
  private readonly session = signal<PopupSession | null>(null);

  readonly isJoined = computed(() => this.session() !== null);
  readonly currentSession = computed(() => this.session());
  readonly currentPopupId = computed(() => this.session()?.popupId ?? null);
  readonly currentPopupName = computed(() => this.session()?.popupName ?? null);

  constructor() {
    this.load();
  }

  /** Primary id for future paths: popups/{popupId}/products, popups/{popupId}/orders */
  getPopupId(): string | null {
    return this.session()?.popupId ?? null;
  }

  getPopupName(): string | null {
    return this.session()?.popupName ?? null;
  }

  getJoinCode(): string | null {
    return this.session()?.joinCode ?? null;
  }

  getCurrentPopup(): PopupSession | null {
    return this.session();
  }

  /**
   * Join an existing popup by invitation code.
   *
   * Local: lookup against KNOWN_POPUPS only.
   * TODO(firebase): Replace lookup with Callable Function / Firestore query by joinCode.
   * TODO(firebase): On success, signInWithCustomToken() with popupId claim.
   */
  async joinWithCode(rawCode: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const joinCode = this.normalizeJoinCode(rawCode);
    if (!joinCode) {
      return { ok: false, error: 'Enter a join code to continue.' };
    }

    const popup = this.findPopupByJoinCode(joinCode);
    if (!popup) {
      return { ok: false, error: 'Invalid join code. Check the code and try again.' };
    }

    const next: PopupSession = {
      popupId: popup.id,
      joinCode: this.normalizeJoinCode(popup.joinCode),
      popupName: popup.name,
      joinedAt: new Date().toISOString(),
    };

    this.session.set(next);
    this.save();
    return { ok: true };
  }

  /**
   * Clears the local popup session (return to join screen).
   * TODO(firebase): Also Firebase Auth signOut().
   */
  leavePopup(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  normalizeJoinCode(rawCode: string): string {
    return rawCode.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Local invitation lookup.
   * TODO(firebase): Query `popups` where joinCode == code (or callable verifyJoinCode).
   */
  private findPopupByJoinCode(joinCode: string): PopupDefinition | undefined {
    const normalized = this.normalizeJoinCode(joinCode);
    return KNOWN_POPUPS.find(
      (popup) => this.normalizeJoinCode(popup.joinCode) === normalized
    );
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw) as Partial<PopupSession>;
      if (typeof data.popupId !== 'string' || typeof data.joinCode !== 'string') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Re-validate against the current registry so removed codes cannot stay unlocked.
      const popup = this.findPopupByJoinCode(data.joinCode);
      if (!popup || popup.id !== data.popupId) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      this.session.set({
        popupId: popup.id,
        joinCode: this.normalizeJoinCode(popup.joinCode),
        popupName: popup.name,
        joinedAt: typeof data.joinedAt === 'string' ? data.joinedAt : new Date().toISOString(),
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private save(): void {
    const current = this.session();
    if (!current) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
}
