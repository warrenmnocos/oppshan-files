import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {UserAccountView} from '../models/user-account-view';

@Injectable({providedIn: 'root'})
export class AuthService {
  private http = inject(HttpClient);

  getCurrentUser(): Observable<UserAccountView | null> {
    return this.http.get<UserAccountView>('/api/auth/me').pipe(catchError(() => of(null)));
  }

  signOut(): void {
    this.http.post('/api/auth/logout', null).subscribe({
      next: () => window.location.href = '/sign-in',
      error: () => window.location.href = '/sign-in',
    });
  }
}
