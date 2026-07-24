import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PopupSessionService } from '../services/popup-session.service';

/** Requires an active popup session (join code). */
export const popupJoinedGuard: CanActivateFn = () => {
  const session = inject(PopupSessionService);
  const router = inject(Router);

  if (session.isJoined()) {
    return true;
  }

  return router.createUrlTree(['/join']);
};

/** Sends already-joined users away from the join screen. */
export const popupJoinPageGuard: CanActivateFn = () => {
  const session = inject(PopupSessionService);
  const router = inject(Router);

  if (!session.isJoined()) {
    return true;
  }

  return router.createUrlTree(['/pos']);
};
