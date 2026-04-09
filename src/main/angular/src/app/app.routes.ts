import {Routes} from '@angular/router';
import {authGuard, guestGuard} from './misc/auth.guard';
import {SignIn} from './pages/sign-in/sign-in.component';
import {Home} from './pages/home/home.component';
import {SignOut} from './pages/sign-out/sign-out.component';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    component: SignIn,
    canActivate: [guestGuard],
  },
  {
    path: 'sign-out',
    component: SignOut,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
