import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {UserAccountView} from '../models/user-account-view';
import {JsonMapperService} from './json-mapper.service';
import {MessageBusService} from './message-bus-service';
import {ApplicationEventType} from '../models/application-event-type';
import {ApplicationEvent} from '../models/application-event';
import {SignInSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(private readonly http: HttpClient,
              private readonly jsonMapperService: JsonMapperService,
              private readonly messageBusService: MessageBusService,) {
  }

  getCurrentUser(): Observable<UserAccountView | null> {
    return this.http.get<Record<string, unknown>>('/api/auth/me')
      .pipe(
        map(raw => this.jsonMapperService.deserialize(UserAccountView, raw)),
        catchError(() => of(null)),
      );
  }

  signIn(tenant: string): void {
    window.location.href = `/sso/sign-in/oidc/${tenant}`;
    const signInSucceeded: SignInSucceeded = {
      messageCode: MessageCode.SignInSucceeded,
      tenant: tenant
    };
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(ApplicationEventType.SignInSucceeded, signInSucceeded));
  }

  signOut(): void {
    this.http.post('/sso/sign-out', null)
      .subscribe({
        next: () => this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutSucceeded),
        error: () => this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutFailed),
      });
  }
}
