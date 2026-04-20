import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot} from '@angular/router';
import {map} from 'rxjs/operators';
import {AuthService} from '../services/auth-service.service';

const REDIRECT_URL_KEY = 'oppshan_redirect_url';

export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.getCurrentUser().pipe(
    map(user => {
      if (user !== null) {
        const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
        if (redirectUrl) {
          sessionStorage.removeItem(REDIRECT_URL_KEY);
          return router.parseUrl(redirectUrl);
        }

        return true;
      }

      if (state.url !== '/') {
        sessionStorage.setItem(REDIRECT_URL_KEY, state.url);
      }

      return router.createUrlTree(['/sso/sign-in']);
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService
    .getCurrentUser()
    .pipe(map(user => (user === null ? true : router.createUrlTree(['/drive']))));
};
