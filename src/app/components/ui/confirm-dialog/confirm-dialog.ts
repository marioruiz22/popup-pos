import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly dialog = inject(ConfirmDialogService);

  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (this.dialog.consumeIgnoredPopstate()) {
      return;
    }

    if (this.dialog.isOpen()) {
      this.dialog.respondFromPopstate();
      return;
    }

    // Dead Forward entry from a dismissed confirm — clear the marker so
    // Forward is spent and does not stay enabled forever.
    if (this.dialog.matchesHistory()) {
      history.replaceState(null, '');
    }
  }

  onBackdropClick(): void {
    this.dialog.respond(false);
  }

  cancel(): void {
    this.dialog.respond(false);
  }

  confirm(): void {
    this.dialog.respond(true);
  }
}
