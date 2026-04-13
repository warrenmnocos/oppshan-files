import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {UserAccountView} from '../models/user-account-view';
import {JsonMapper} from './json-mapper.service';

@Injectable({providedIn: 'root'})
export class AuthService {

  constructor(private readonly http: HttpClient,
              private readonly jsonMapper: JsonMapper) {
  }

  getCurrentUser(): Observable<UserAccountView | null> {
    return this.http.get<Record<string, unknown>>('/api/auth/me')
      .pipe(
        map(raw => this.jsonMapper.deserialize(UserAccountView, raw)),
        catchError(() => of(null)),
      );
  }

  signOut(): void {
    this.http.post('/sso/sign-out', null).subscribe({
      next: () => window.location.href = '/sso/sign-in',
      error: () => window.location.href = '/sso/sign-in',
    });
  }
}
