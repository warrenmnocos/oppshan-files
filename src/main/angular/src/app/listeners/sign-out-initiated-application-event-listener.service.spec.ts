import { SignOutInitiatedApplicationEventListener } from './sign-out-initiated-application-event-listener.service';
import { AuthService } from '../services/auth-service.service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

describe('SignOutInitiatedApplicationEventListener', () => {
  let authService: { signOut: ReturnType<typeof vi.fn> };
  let listener: SignOutInitiatedApplicationEventListener;

  beforeEach(() => {
    authService = { signOut: vi.fn() };
    listener = new SignOutInitiatedApplicationEventListener(authService as unknown as AuthService);
  });

  it('should call AuthService.signOut on a SignOutInitiated event', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignOutInitiated, null));
    expect(authService.signOut).toHaveBeenCalledTimes(1);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignInInitiated, null));
    expect(authService.signOut).not.toHaveBeenCalled();
  });
});
