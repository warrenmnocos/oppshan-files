import {HttpErrorResponse, HttpEventType, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {FileCreateCommand} from '../models/operation-commands';
import {
  FileCreateFailed,
  FileCreateSucceeded,
  FileUploadFailed,
  FileUploadInitiated,
  FileUploadProgressUpdated,
  FileUploadSucceeded,
} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {DirectoryContentsView} from '../models/directory-contents-view';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class FileCreateConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.FileCreateConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as FileCreateCommand;
    for (const file of command.files) {
      this.uploadFile(command.parentUuid, file);
    }
  }

  private uploadFile(parentUuid: string, file: File): void {
    const id = window.crypto.randomUUID();

    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileUploadInitiated,
        {
          id,
          label: file.name,
        } as FileUploadInitiated
      )
    );

    this.fileService.uploadFile(parentUuid, file).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.messageBusService.fireApplicationEvent(
            new ApplicationEvent(ApplicationEventType.FileUploadProgressUpdated,
              {
                id,
                progress: Math.round(100 * event.loaded / event.total),
              } as FileUploadProgressUpdated)
          );
        } else if (event instanceof HttpResponse) {
          const directoryContentsView = event.body as DirectoryContentsView;
          this.messageBusService.fireApplicationEvent(
            new ApplicationEvent(ApplicationEventType.FileUploadSucceeded,
              {
                id,
                directoryContentsView,
              } as FileUploadSucceeded
            )
          );
          this.messageBusService.fireApplicationEvent(
            new ApplicationEvent(ApplicationEventType.FileCreateSucceeded,
              {
                messageCode: MessageCode.FileUploaded,
                directoryContentsView,
              } as FileCreateSucceeded
            )
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        const messageCode = resolveMessageCode(error);
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileUploadFailed, {
              id,
              messageCode,
            } as FileUploadFailed
          )
        );
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileCreateFailed, {
              messageCode,
            } as FileCreateFailed
          )
        );
      },
    });
  }
}
