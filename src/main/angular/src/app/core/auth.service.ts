import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

export interface UserAccount {
  id: string;
  name: string;
  maxStorageBytes: number;
  createdAt: string;
}

@Injectable({providedIn: 'root'})
export class AuthService {
  private http = inject(HttpClient);

  getCurrentUser(): Observable<UserAccount | null> {
    return this.http.get<UserAccount>('/api/auth/me').pipe(catchError(() => of(null)));
  }
}
