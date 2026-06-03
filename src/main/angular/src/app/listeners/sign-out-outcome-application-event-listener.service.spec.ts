import { SignOutOutcomeApplicationEventListener } from './sign-out-outcome-application-event-listener.service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

describe('SignOutOutcomeApplicationEventListener', () => {
  let listener: SignOutOutcomeApplicationEventListener;
  let originalLocation: Location;
  let locationStub: { href: string };

  beforeEach(() => {
    listener = new SignOutOutcomeApplicationEventListener();
    originalLocation = window.location;
    locationStub = { href: '' };
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: locationStub,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('should redirect to the SSO sign-in page on SignOutSucceeded', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignOutSucceeded, null));
    expect(locationStub.href).toBe('/sso/sign-in');
  });

  it('should redirect to the SSO sign-in page on SignOutFailed', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignOutFailed, null));
    expect(locationStub.href).toBe('/sso/sign-in');
  });

  it('should not redirect on unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignOutInitiated, null));
    expect(locationStub.href).toBe('');
  });
});
