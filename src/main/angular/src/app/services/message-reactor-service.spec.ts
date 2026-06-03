import { TestBed } from '@angular/core/testing';
import { MessageReactorService } from './message-reactor-service';
import { MessageBusService } from './message-bus-service';
import { MESSAGE_LISTENERS, MessageListener } from '../listeners/message-listener';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

describe('MessageReactorService', () => {
  let service: MessageReactorService;
  let bus: MessageBusService;
  let listenerA: MessageListener;
  let listenerB: MessageListener;

  beforeEach(() => {
    listenerA = { onMessage: vi.fn() };
    listenerB = { onMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        MessageReactorService,
        MessageBusService,
        { provide: MESSAGE_LISTENERS, useValue: [listenerA, listenerB] },
      ],
    });
    service = TestBed.inject(MessageReactorService);
    bus = TestBed.inject(MessageBusService);
  });

  it('should not dispatch messages before start is called', () => {
    bus.fireApplicationEventOfType(ApplicationEventType.SignInInitiated);

    expect(listenerA.onMessage).not.toHaveBeenCalled();
    expect(listenerB.onMessage).not.toHaveBeenCalled();
  });

  it('should fan a fired message out to every listener after start', () => {
    service.start();
    const event = new ApplicationEvent(ApplicationEventType.SignInInitiated);
    bus.fireApplicationEvent(event);

    expect(listenerA.onMessage).toHaveBeenCalledWith(event);
    expect(listenerB.onMessage).toHaveBeenCalledWith(event);
  });

  it('should be idempotent — a second start does not double-subscribe', () => {
    service.start();
    service.start();
    bus.fireApplicationEventOfType(ApplicationEventType.SignInInitiated);

    expect(listenerA.onMessage).toHaveBeenCalledTimes(1);
    expect(listenerB.onMessage).toHaveBeenCalledTimes(1);
  });

  it('should stop dispatching after stop is called', () => {
    service.start();
    service.stop();
    bus.fireApplicationEventOfType(ApplicationEventType.SignInInitiated);

    expect(listenerA.onMessage).not.toHaveBeenCalled();
    expect(listenerB.onMessage).not.toHaveBeenCalled();
  });

  it('should resume dispatching when started again after a stop', () => {
    service.start();
    service.stop();
    service.start();
    bus.fireApplicationEventOfType(ApplicationEventType.SignInInitiated);

    expect(listenerA.onMessage).toHaveBeenCalledTimes(1);
  });
});
