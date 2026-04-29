import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {MessageCode} from '../models/message-code';
import {NotificationService} from '../services/notification-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';

@Injectable()
export class NotificationRequiredApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly notificationService: NotificationService) {
    super(
      ApplicationEventType.DirectoryCreateSucceeded,
      ApplicationEventType.DirectoryRenameSucceeded,
      ApplicationEventType.DirectoryDeletionSucceeded,
      ApplicationEventType.DirectoryCreateFailed,
      ApplicationEventType.DirectoryRenameFailed,
      ApplicationEventType.DirectoryDeletionFailed,
      ApplicationEventType.FileCreateSucceeded,
      ApplicationEventType.FileCreateFailed,
      ApplicationEventType.FileRenameSucceeded,
      ApplicationEventType.FileRenameFailed,
      ApplicationEventType.FileDeletionSucceeded,
      ApplicationEventType.FileDeletionFailed,
      ApplicationEventType.FileDownloadSucceeded,
      ApplicationEventType.FileDownloadFailed,
    );
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const payload = applicationEvent.payload as { messageCode: MessageCode } | null;
    if (!payload) {
      return;
    }
    this.notificationService.push(payload.messageCode);
  }
}
