import { ApplicationEvent } from './application-event';
import { ApplicationEventType } from './application-event-type';

describe('ApplicationEvent', () => {
  it('should set the type and default the payload to null', () => {
    const event = new ApplicationEvent(ApplicationEventType.SignInInitiated);
    expect(event.type).toBe(ApplicationEventType.SignInInitiated);
    expect(event.payload).toBeNull();
  });

  it('should retain an explicitly supplied payload', () => {
    const payload = { uuid: 'abc', name: 'docs' };
    const event = new ApplicationEvent(ApplicationEventType.DirectoryCreateConfirmed, payload);
    expect(event.type).toBe(ApplicationEventType.DirectoryCreateConfirmed);
    expect(event.payload).toBe(payload);
  });

  it('should preserve a falsy non-null payload rather than defaulting it', () => {
    const event = new ApplicationEvent(ApplicationEventType.SignInInitiated, 0);
    expect(event.payload).toBe(0);
  });
});
