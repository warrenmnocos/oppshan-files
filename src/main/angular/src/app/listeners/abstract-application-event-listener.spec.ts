import { AbstractApplicationEventListener } from './abstract-application-event-listener';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

class TestListener extends AbstractApplicationEventListener {
  readonly received: ApplicationEvent[] = [];

  constructor(...types: ApplicationEventType[]) {
    super(...types);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    this.received.push(applicationEvent);
  }
}

describe('AbstractApplicationEventListener', () => {
  it('should ignore messages that are not ApplicationEvent instances', () => {
    const listener = new TestListener(ApplicationEventType.SignInInitiated);
    listener.onMessage('not an event');
    listener.onMessage(null);
    listener.onMessage({ type: ApplicationEventType.SignInInitiated, payload: {} });
    expect(listener.received).toHaveLength(0);
  });

  it('should ignore event types it did not subscribe to', () => {
    const listener = new TestListener(ApplicationEventType.SignInInitiated);
    listener.onMessage(new ApplicationEvent(ApplicationEventType.SignOutInitiated, {}));
    expect(listener.received).toHaveLength(0);
  });

  it('should call onApplicationEvent for a subscribed type', () => {
    const listener = new TestListener(ApplicationEventType.SignInInitiated);
    const event = new ApplicationEvent(ApplicationEventType.SignInInitiated, { tenant: 'google' });
    listener.onMessage(event);
    expect(listener.received).toEqual([event]);
  });

  it('should dispatch each of several subscribed types', () => {
    const listener = new TestListener(
      ApplicationEventType.FileUploadInitiated,
      ApplicationEventType.FileUploadSucceeded,
    );
    const a = new ApplicationEvent(ApplicationEventType.FileUploadInitiated, {});
    const b = new ApplicationEvent(ApplicationEventType.FileUploadSucceeded, {});
    listener.onMessage(a);
    listener.onMessage(b);
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileUploadFailed, {}));
    expect(listener.received).toEqual([a, b]);
  });
});
