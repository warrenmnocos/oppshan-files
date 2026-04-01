import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {AuthService} from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService
    .getCurrentUser()
    .pipe(map(user => (user !== null ? true : router.createUrlTree(['/sign-in']))));
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService
    .getCurrentUser()
    .pipe(map(user => (user === null ? true : router.createUrlTree(['/']))));
};
