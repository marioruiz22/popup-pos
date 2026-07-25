import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly dialog = inject(ConfirmDialogService);

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
