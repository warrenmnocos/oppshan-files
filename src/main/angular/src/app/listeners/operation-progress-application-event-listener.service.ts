import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {
  FileDownloadFailed,
  FileDownloadInitiated,
  FileDownloadProgressUpdated,
  FileDownloadSucceeded,
  FileUploadFailed,
  FileUploadInitiated,
  FileUploadProgressUpdated,
  FileUploadSucceeded,
} from '../models/operation-outcomes';
import {NotificationService} from '../services/notification-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';

@Injectable()
export class OperationProgressApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly notificationService: NotificationService) {
    super(
      ApplicationEventType.FileUploadInitiated,
      ApplicationEventType.FileUploadProgressUpdated,
      ApplicationEventType.FileUploadSucceeded,
      ApplicationEventType.FileUploadFailed,
      ApplicationEventType.FileDownloadInitiated,
      ApplicationEventType.FileDownloadProgressUpdated,
      ApplicationEventType.FileDownloadSucceeded,
      ApplicationEventType.FileDownloadFailed,
    );
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    switch (applicationEvent.type) {
      case ApplicationEventType.FileUploadInitiated: {
        const payload = applicationEvent.payload as FileUploadInitiated;
        this.notificationService.addProgress('upload', payload.id, payload.label, payload.params);
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
      case ApplicationEventType.FileDownloadInitiated: {
        const payload = applicationEvent.payload as FileDownloadInitiated;
        this.notificationService.addProgress('download', payload.id, payload.label, payload.params);
        break;
      }
      case ApplicationEventType.FileDownloadProgressUpdated: {
        const payload = applicationEvent.payload as FileDownloadProgressUpdated;
        this.notificationService.updateProgress(payload.id, payload.progress);
        break;
      }
      case ApplicationEventType.FileDownloadSucceeded:
      case ApplicationEventType.FileDownloadFailed: {
        const payload = applicationEvent.payload as FileDownloadSucceeded | FileDownloadFailed;
        this.notificationService.removeProgress(payload.id);
        break;
      }
    }
  }
}
