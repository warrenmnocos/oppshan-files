import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Drive } from './drive.component';
import { AuthService } from '../../services/auth-service.service';
import { MessageCode } from '../../models/message-code';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { DirectoryNavigationFailed } from '../../models/operation-outcomes';

type Internals = {
  handleApplicationEvent: (event: ApplicationEvent) => void;
  errorMessageCode: () => MessageCode | null;
  loading: () => boolean;
};

function configure(): void {
  TestBed.configureTestingModule({
    imports: [Drive],
    providers: [
      provideTranslateService({ lang: 'en' }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      // ActivatedRoute.url replays on subscribe; an empty segment list is enough for construction.
      {
        provide: ActivatedRoute,
        useValue: { url: of([]), snapshot: { queryParamMap: { get: () => null } } },
      },
      { provide: AuthService, useValue: { getCurrentUser: () => of(null) } },
    ],
  });
}

describe('Drive', () => {
  beforeEach(async () => {
    configure();
    await TestBed.compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = TestBed.createComponent(Drive);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should record the error code and clear loading on a navigation failure', () => {
    const fixture = TestBed.createComponent(Drive);
    const instance = fixture.componentInstance as unknown as Internals;

    const failure: DirectoryNavigationFailed = {
      messageCode: MessageCode.DirectoryNotFound,
      path: 'missing',
    };
    instance.handleApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationFailed, failure),
    );

    expect(instance.errorMessageCode()).toBe(MessageCode.DirectoryNotFound);
    expect(instance.loading()).toBe(false);
  });

  it('should enter the loading state when a navigation is initiated', () => {
    const fixture = TestBed.createComponent(Drive);
    const instance = fixture.componentInstance as unknown as Internals;

    instance.handleApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, { uuid: 'x' }),
    );

    expect(instance.loading()).toBe(true);
    expect(instance.errorMessageCode()).toBeNull();
  });
});
