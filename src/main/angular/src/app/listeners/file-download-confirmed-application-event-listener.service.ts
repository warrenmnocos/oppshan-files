import {HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {FileDownloadCommand} from '../models/operation-commands';
import {
  FileDownloadFailed,
  FileDownloadInitiated,
  FileDownloadProgressUpdated,
  FileDownloadSucceeded,
} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class FileDownloadConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.FileDownloadConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as FileDownloadCommand;
    this.downloadFile(command.uuid, command.name);
  }

  private downloadFile(uuid: string, name: string): void {
    const id = window.crypto.randomUUID();

    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileDownloadInitiated, {
        id,
        label: name,
      } as FileDownloadInitiated)
    );

    this.fileService.downloadFile(uuid).subscribe({
      next: (event: HttpEvent<Blob>) => {
        if (event.type === HttpEventType.DownloadProgress && event.total) {
          this.messageBusService.fireApplicationEvent(
            new ApplicationEvent(ApplicationEventType.FileDownloadProgressUpdated, {
              id,
              progress: Math.round(100 * event.loaded / event.total),
            } as FileDownloadProgressUpdated)
          );
        } else if (event instanceof HttpResponse) {
          this.triggerBrowserSave(event.body as Blob, name);
          this.messageBusService.fireApplicationEvent(
            new ApplicationEvent(ApplicationEventType.FileDownloadSucceeded, {
              id,
              messageCode: MessageCode.FileDownloaded,
            } as FileDownloadSucceeded)
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        const messageCode = resolveMessageCode(error);
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileDownloadFailed, {
            id,
            messageCode,
          } as FileDownloadFailed)
        );
      },
    });
  }

  private triggerBrowserSave(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
}
