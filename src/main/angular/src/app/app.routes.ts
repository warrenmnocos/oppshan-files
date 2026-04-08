import {Routes} from '@angular/router';
import {authGuard, guestGuard} from './core/auth.guard';
import {Landing} from './pages/landing/landing';
import {RootDirectory} from './pages/root-directory/root-directory';

export const routes: Routes = [
  {
    path: '',
    component: RootDirectory,
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    component: Landing,
    canActivate: [guestGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
