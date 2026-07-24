/**
 * Active popup context after a successful invitation join.
 * Kept separate from products/orders; those services read popupId when syncing later.
 *
 * TODO(firebase): Establish this session via Cloud Function verify + Auth custom token
 * with popupId claims (no client-side popup creation).
 */
export interface PopupSession {
  /** Firestore-ready popup document id: popups/{popupId} */
  popupId: string;
  /** Normalized invitation code that matched a known popup. */
  joinCode: string;
  /** Popup/event display name from the invitation registry. */
  popupName: string;
  joinedAt: string;
}
