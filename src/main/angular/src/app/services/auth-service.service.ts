import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {UserAccountView} from '../models/user-account-view';
import {JsonMapper} from './json-mapper.service';
import {MessageBusService} from './message-bus-service';
import {ApplicationEventType} from '../models/application-event-type';
import {ApplicationEvent} from '../models/application-event';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(private readonly http: HttpClient,
              private readonly jsonMapper: JsonMapper,
              private readonly messageBusService: MessageBusService,) {
  }

  getCurrentUser(): Observable<UserAccountView | null> {
    return this.http.get<Record<string, unknown>>('/api/auth/me')
      .pipe(
        map(raw => this.jsonMapper.deserialize(UserAccountView, raw)),
        catchError(() => of(null)),
      );
  }

  signIn(tenant: string): void {
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(ApplicationEventType.SignInInitiated, tenant));
    window.location.href = `/sso/sign-in/oidc/${tenant}`;
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(ApplicationEventType.SignInSucceeded, tenant));
  }

  signOut(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutInitiated);
    this.http.post('/sso/sign-out', null)
      .subscribe({
        next: () => this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutSucceeded),
        error: () => this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutFailed),
      });
  }
}
