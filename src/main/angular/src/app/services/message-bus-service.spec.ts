import { TestBed } from '@angular/core/testing';
import { MessageBusService } from './message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';

describe('MessageBusService', () => {
  let service: MessageBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageBusService);
  });

  it('should start the signal at the None event', () => {
    expect(service.applicationEventSignal().type).toBe(ApplicationEventType.None);
    expect(service.applicationEvenTypeSignal()).toBe(ApplicationEventType.None);
  });

  it('should push onto the typed stream when firing an event', () => {
    const seen: ApplicationEvent[] = [];
    const sub = service.applicationEventStream.subscribe((e) => seen.push(e));
    const event = new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, { x: 1 });
    service.fireApplicationEvent(event);
    expect(seen).toEqual([event]);
    sub.unsubscribe();
  });

  it('should wrap the type in an ApplicationEvent when firing by type', () => {
    const seen: ApplicationEventType[] = [];
    const sub = service.applicationEventTypeStream.subscribe((t) => seen.push(t));
    service.fireApplicationEventOfType(ApplicationEventType.SignInInitiated);
    expect(seen).toEqual([ApplicationEventType.SignInInitiated]);
    sub.unsubscribe();
  });

  it('should filter non-ApplicationEvent messages out of the typed event stream', () => {
    const rawSeen: unknown[] = [];
    const typedSeen: ApplicationEvent[] = [];
    const rawSub = service.messages.subscribe((m) => rawSeen.push(m));
    const typedSub = service.applicationEventStream.subscribe((e) => typedSeen.push(e));

    // Push a raw non-event through the underlying subject.
    (service as unknown as { messageSubject: { next: (v: unknown) => void } }).messageSubject.next(
      'not-an-event',
    );
    const event = new ApplicationEvent(ApplicationEventType.SignInInitiated);
    service.fireApplicationEvent(event);

    expect(rawSeen).toEqual(['not-an-event', event]);
    expect(typedSeen).toEqual([event]);
    rawSub.unsubscribe();
    typedSub.unsubscribe();
  });
});
