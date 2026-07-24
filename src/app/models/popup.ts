/**
 * A popup/event that devices can join by invitation code.
 * TODO(firebase): Loaded from Firestore `popups/{popupId}` instead of a local list.
 * Admin tooling will create these documents; clients never create them.
 */
export interface PopupDefinition {
  /** Stable id used as Firestore path segment: popups/{popupId}/... */
  id: string;
  /** Invitation code users enter on the join screen (case-insensitive). */
  joinCode: string;
  /** Display name for the popup/event. */
  name: string;
}
