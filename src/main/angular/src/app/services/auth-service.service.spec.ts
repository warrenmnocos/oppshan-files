import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth-service.service';
import { JsonMapperService } from './json-mapper.service';
import { MessageBusService } from './message-bus-service';
import { UserAccountView } from '../models/user-account-view';
import { ApplicationEventType } from '../models/application-event-type';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let bus: MessageBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        JsonMapperService,
        MessageBusService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    bus = TestBed.inject(MessageBusService);
  });

  afterEach(() => httpMock.verify());

  describe('getCurrentUser', () => {
    it('should GET /api/auth/me and hydrate the UserAccountView', () => {
      let result: UserAccountView | null | undefined;
      service.getCurrentUser().subscribe((v) => (result = v));

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      req.flush({ uuid: 'u1', email: 'a@b.c' });

      expect(result).toBeInstanceOf(UserAccountView);
      expect(result?.uuid).toBe('u1');
    });

    it('should emit null when the request fails', () => {
      let result: UserAccountView | null | undefined = undefined;
      service.getCurrentUser().subscribe((v) => (result = v));

      httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should POST /sso/sign-out and fire SignOutSucceeded on success', () => {
      const fired: ApplicationEventType[] = [];
      const sub = bus.applicationEventTypeStream.subscribe((t) => fired.push(t));

      service.signOut();
      const req = httpMock.expectOne('/sso/sign-out');
      expect(req.request.method).toBe('POST');
      req.flush(null);

      expect(fired).toContain(ApplicationEventType.SignOutSucceeded);
      sub.unsubscribe();
    });

    it('should fire SignOutFailed when the request errors', () => {
      const fired: ApplicationEventType[] = [];
      const sub = bus.applicationEventTypeStream.subscribe((t) => fired.push(t));

      service.signOut();
      httpMock.expectOne('/sso/sign-out').flush(null, { status: 500, statusText: 'Error' });

      expect(fired).toContain(ApplicationEventType.SignOutFailed);
      sub.unsubscribe();
    });
  });
});
