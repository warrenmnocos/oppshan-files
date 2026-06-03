import { NotificationRequiredApplicationEventListener } from './notification-required-application-event-listener.service';
import { NotificationService } from '../services/notification-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';

describe('NotificationRequiredApplicationEventListener', () => {
  let notificationService: { push: ReturnType<typeof vi.fn> };
  let listener: NotificationRequiredApplicationEventListener;

  beforeEach(() => {
    notificationService = { push: vi.fn() };
    listener = new NotificationRequiredApplicationEventListener(
      notificationService as unknown as NotificationService,
    );
  });

  it('should push the payload messageCode for a subscribed outcome event', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateSucceeded, {
        messageCode: MessageCode.DirectoryCreated,
      }),
    );
    expect(notificationService.push).toHaveBeenCalledWith(MessageCode.DirectoryCreated);
  });

  it('should ignore event types it did not subscribe to', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, {
        messageCode: MessageCode.DirectoryCreated,
      }),
    );
    expect(notificationService.push).not.toHaveBeenCalled();
  });

  it('should ignore non-ApplicationEvent messages', () => {
    listener.onMessage('not an event');
    expect(notificationService.push).not.toHaveBeenCalled();
  });

  it('should do nothing when the payload is null', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileDeletionFailed, null));
    expect(notificationService.push).not.toHaveBeenCalled();
  });
});
