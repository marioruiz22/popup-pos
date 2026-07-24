import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PopupSessionService } from '../../services/popup-session.service';

@Component({
  selector: 'app-join-page',
  imports: [FormsModule],
  templateUrl: './join.page.html',
  styleUrl: './join.page.scss',
})
export class JoinPage {
  private readonly popupSession = inject(PopupSessionService);
  private readonly router = inject(Router);

  joinCode = '';
  errorMessage = '';
  submitting = false;

  async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.errorMessage = '';
    this.submitting = true;

    try {
      const result = await this.popupSession.joinWithCode(this.joinCode);
      if (!result.ok) {
        this.errorMessage = result.error;
        return;
      }

      await this.router.navigateByUrl('/pos');
    } finally {
      this.submitting = false;
    }
  }
}
