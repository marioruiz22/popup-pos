import { Injectable, inject } from '@angular/core';
import {
  Auth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';

/**
 * Ensures the device has a Firebase Auth session so Firestore rules can require
 * `request.auth != null`.
 *
 * Today: anonymous sign-in after a successful join.
 * TODO(firebase): Replace with custom token (join code → popupId claim).
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private ready: Promise<User | null> | null = null;

  /** Wait until Firebase Auth has restored any existing session. */
  whenReady(): Promise<User | null> {
    if (!this.ready) {
      this.ready = new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(this.auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    }
    return this.ready;
  }

  async ensureSignedIn(): Promise<void> {
    const existing = await this.whenReady();
    if (existing) {
      return;
    }

    await signInAnonymously(this.auth);
  }

  async signOut(): Promise<void> {
    await this.whenReady();
    if (this.auth.currentUser) {
      await signOut(this.auth);
    }
  }
}
