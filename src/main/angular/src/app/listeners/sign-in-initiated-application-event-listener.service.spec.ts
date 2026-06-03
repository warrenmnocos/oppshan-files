import { SignInInitiatedApplicationEventListener } from './sign-in-initiated-application-event-listener.service';
import { AuthService } from '../services/auth-service.service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

describe('SignInInitiatedApplicationEventListener', () => {
  let authService: { signIn: ReturnType<typeof vi.fn> };
  let listener: SignInInitiatedApplicationEventListener;

  beforeEach(() => {
    authService = { signIn: vi.fn() };
    listener = new SignInInitiatedApplicationEventListener(authService as unknown as AuthService);
  });

  it('should call AuthService.signIn with the tenant from the command payload', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.SignInInitiated, { tenant: 'google' }),
    );
    expect(authService.signIn).toHaveBeenCalledWith('google');
  });

  it('should call AuthService.signIn with undefined when the payload is null', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignInInitiated, null));
    expect(authService.signIn).toHaveBeenCalledWith(undefined);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.SignOutInitiated, { tenant: 'google' }),
    );
    expect(authService.signIn).not.toHaveBeenCalled();
  });
});
