import { Injectable, computed, signal } from '@angular/core';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm action as destructive (delete / leave). */
  danger?: boolean;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  resolve: (confirmed: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  private readonly state = signal<ConfirmDialogState | null>(null);

  readonly isOpen = computed(() => this.state() !== null);
  readonly active = computed(() => this.state());

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    // Replace any existing dialog so we never leave a dangling promise.
    this.state()?.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.state.set({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
      });
    });
  }

  respond(confirmed: boolean): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.state.set(null);
    current.resolve(confirmed);
  }
}
