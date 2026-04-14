import {Routes} from '@angular/router';
import {authGuard, guestGuard} from './misc/auth.guard';

export const routes: Routes = [
  {
    path: 'drive',
    children: [
      {
        path: '**',
        loadComponent: () => import('./pages/drive/drive.component').then(m => m.Drive),
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'sso',
    children: [
      {
        path: 'sign-in',
        loadComponent: () => import('./pages/sign-in/sign-in.component').then(m => m.SignIn),
        canActivate: [guestGuard],
      },
      {
        path: 'sign-out',
        loadComponent: () => import('./pages/sign-out/sign-out.component').then(m => m.SignOut),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'drive',
  },
];
