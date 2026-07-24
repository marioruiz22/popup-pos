import { PopupDefinition } from '../models/popup';

/**
 * Manually managed invitation registry (local stand-in for Firestore `popups`).
 *
 * - Only codes listed here can unlock the app.
 * - Entering an unknown code must NOT create a popup.
 * - TODO(firebase): Replace with a query/callable that looks up popups by joinCode.
 * - TODO(firebase): Popup creation becomes an admin-only action.
 */
export const KNOWN_POPUPS: readonly PopupDefinition[] = [
  {
    id: 'spring-fundraiser',
    joinCode: 'SPRING26',
    name: 'Spring Fundraiser',
  },
  {
    id: 'demo-popup',
    joinCode: 'DEMO',
    name: 'Demo Popup',
  },
];
