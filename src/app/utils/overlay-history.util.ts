/**
 * Ties an overlay (checkout, product editor, order details, confirm) to the
 * browser history stack so Back / swipe-back closes the overlay instead of
 * leaving the page.
 */
export class OverlayHistoryBridge {
  private pushed = false;
  private ignoreNextPopstate = false;

  constructor(private readonly stateKey: string) {}

  /** True when the current history entry belongs to this overlay. */
  matchesState(state: unknown = history.state): boolean {
    return Boolean(
      state &&
        typeof state === 'object' &&
        (state as Record<string, unknown>)[this.stateKey] === true
    );
  }

  /** Call when the overlay opens. */
  push(): void {
    if (this.pushed) {
      return;
    }
    history.pushState({ [this.stateKey]: true }, '');
    this.pushed = true;
  }

  /**
   * Call when the overlay is closed from UI (×, save, cancel, etc.).
   * Uses history.back() so we don't leave a phantom entry; the resulting
   * popstate is ignored via {@link consumeIgnoredPopstate}.
   */
  closeFromUi(): void {
    if (this.pushed && this.matchesState(history.state)) {
      this.ignoreNextPopstate = true;
      history.back();
    }
    this.pushed = false;
  }

  /**
   * Call at the start of a popstate handler. Returns true when this popstate
   * was caused by {@link closeFromUi} and should be ignored.
   */
  consumeIgnoredPopstate(): boolean {
    if (!this.ignoreNextPopstate) {
      return false;
    }
    this.ignoreNextPopstate = false;
    return true;
  }

  /** Call from popstate when the overlay was open — history already moved back. */
  closeFromPopstate(): void {
    this.pushed = false;
  }

  /**
   * Call when Forward lands on our history entry and we reopen the overlay.
   * Marks the bridge as active without pushing another entry.
   */
  adoptCurrentState(): void {
    this.pushed = this.matchesState(history.state);
  }

  /**
   * Call on page destroy if the overlay might still be open.
   * Clears our marker without history.back() (which could undo route navigation).
   */
  clearOnDestroy(): void {
    if (this.pushed && this.matchesState(history.state)) {
      history.replaceState(null, '');
    }
    this.ignoreNextPopstate = false;
    this.pushed = false;
  }
}
