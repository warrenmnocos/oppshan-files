import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { SignIn } from './sign-in.component';
import { MessageCode } from '../../models/message-code';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { SignInCommand } from '../../models/operation-commands';

function activatedRouteWith(params: Record<string, string>): Partial<ActivatedRoute> {
  return {
    snapshot: {
      queryParamMap: {
        get: (key: string) => params[key] ?? null,
      },
    },
  } as unknown as Partial<ActivatedRoute>;
}

function configure(params: Record<string, string>): void {
  TestBed.configureTestingModule({
    imports: [SignIn],
    providers: [
      provideTranslateService({ lang: 'en' }),
      { provide: ActivatedRoute, useValue: activatedRouteWith(params) },
    ],
  });
}

describe('SignIn', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    configure({});
    const fixture = TestBed.createComponent(SignIn);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should map a known query message to its MessageCode on init', () => {
    configure({ message: MessageCode.SignInFailed });
    const fixture = TestBed.createComponent(SignIn);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { errorKey: () => MessageCode | null };
    expect(instance.errorKey()).toBe(MessageCode.SignInFailed);
  });

  it('should fall back to Unknown for an unrecognized query message', () => {
    configure({ message: 'not-a-real-code' });
    const fixture = TestBed.createComponent(SignIn);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { errorKey: () => MessageCode | null };
    expect(instance.errorKey()).toBe(MessageCode.Unknown);
  });

  it('should fire SignInInitiated with the default google tenant', () => {
    configure({});
    const fixture = TestBed.createComponent(SignIn);
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    fixture.componentInstance.signIn();

    const event = spy.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.SignInInitiated);
    expect((event.payload as SignInCommand).tenant).toBe('google');
  });

  it('should carry an explicit tenant query param into the command', () => {
    configure({ tenant: 'keycloak' });
    const fixture = TestBed.createComponent(SignIn);
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    fixture.componentInstance.signIn();

    const event = spy.mock.calls[0][0] as ApplicationEvent;
    expect((event.payload as SignInCommand).tenant).toBe('keycloak');
  });
});
