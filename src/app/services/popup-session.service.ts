import { Injectable, computed, signal } from '@angular/core';
import { PopupSession } from '../models/popup-session';

const STORAGE_KEY = 'popup-pos-popup-session';

@Injectable({
  providedIn: 'root',
})
export class PopupSessionService {
  private readonly session = signal<PopupSession | null>(null);

  readonly isJoined = computed(() => this.session() !== null);
  readonly currentSession = computed(() => this.session());

  constructor() {
    this.load();
  }

  getPopupId(): string | null {
    return this.session()?.popupId ?? null;
  }

  getJoinCode(): string | null {
    return this.session()?.joinCode ?? null;
  }

  /**
   * Unlocks the app for this device using a join code.
   *
   * Local behavior (pre-Firebase): any non-empty code creates a session. Random visitors
   * still get their own empty local data; this mainly establishes the UX + popupId shape.
   *
   * TODO(firebase): Call a Callable Function to verify the join code, then
   * signInWithCustomToken() so Security Rules can enforce popupId. Reject invalid codes.
   */
  async joinWithCode(rawCode: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const joinCode = this.normalizeJoinCode(rawCode);
    if (!joinCode) {
      return { ok: false, error: 'Enter a join code to continue.' };
    }

    if (joinCode.length < 4) {
      return { ok: false, error: 'Join codes are at least 4 characters.' };
    }

    // TODO(firebase): const result = await verifyJoinCode(joinCode); use result.popupId / token
    const popupId = this.localPopupIdFromCode(joinCode);

    const next: PopupSession = {
      popupId,
      joinCode,
      joinedAt: new Date().toISOString(),
    };

    this.session.set(next);
    this.save();
    return { ok: true };
  }

  /**
   * Clears the local popup session (lock screen again).
   * TODO(firebase): Also signOut() of Firebase Auth.
   */
  leavePopup(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  normalizeJoinCode(rawCode: string): string {
    return rawCode.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Deterministic local id so the same join code maps to the same popupId on a device.
   * TODO(firebase): Use the real Firestore popup document id from the verify response.
   */
  private localPopupIdFromCode(joinCode: string): string {
    return `local_${joinCode}`;
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw) as Partial<PopupSession>;
      if (typeof data.popupId === 'string' && typeof data.joinCode === 'string') {
        this.session.set({
          popupId: data.popupId,
          joinCode: data.joinCode,
          joinedAt: typeof data.joinedAt === 'string' ? data.joinedAt : new Date().toISOString(),
        });
      }
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
