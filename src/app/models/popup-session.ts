/**
 * Local popup membership session.
 * TODO(firebase): Replace local join with Cloud Function verification + Firebase Auth
 * custom token that includes popupId in claims.
 */
export interface PopupSession {
  /** Stable popup identifier derived from the join code (local) / Firestore id (future). */
  popupId: string;
  /** Normalized join code used to enter this popup (local convenience; do not treat as secret storage). */
  joinCode: string;
  joinedAt: string;
}
