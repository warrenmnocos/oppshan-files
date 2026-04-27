import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {
  FileUploadFailed,
  FileUploadInitiated,
  FileUploadProgressUpdated,
  FileUploadSucceeded,
} from '../models/operation-outcomes';
import {NotificationService} from '../services/notification-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';

@Injectable()
export class UploadProgressApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly notificationService: NotificationService) {
    super(
      ApplicationEventType.FileUploadInitiated,
      ApplicationEventType.FileUploadProgressUpdated,
      ApplicationEventType.FileUploadSucceeded,
      ApplicationEventType.FileUploadFailed,
    );
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    switch (applicationEvent.type) {
      case ApplicationEventType.FileUploadInitiated: {
        const payload = applicationEvent.payload as FileUploadInitiated;
        this.notificationService.addProgress(payload.id, payload.label, payload.params);
        break;
      }
      case ApplicationEventType.FileUploadProgressUpdated: {
        const payload = applicationEvent.payload as FileUploadProgressUpdated;
        this.notificationService.updateProgress(payload.id, payload.progress);
        break;
      }
      case ApplicationEventType.FileUploadSucceeded:
      case ApplicationEventType.FileUploadFailed: {
        const payload = applicationEvent.payload as FileUploadSucceeded | FileUploadFailed;
        this.notificationService.removeProgress(payload.id);
        break;
      }
    }
  }
}