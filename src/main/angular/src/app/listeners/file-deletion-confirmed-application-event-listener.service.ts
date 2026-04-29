import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {FileDeletionCommand} from '../models/operation-commands';
import {FileDeletionFailed, FileDeletionSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class FileDeletionConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.FileDeletionConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as FileDeletionCommand;
    this.fileService.deleteFile(command.uuid).subscribe({
      next: directoryContentsView => {
        const payload: FileDeletionSucceeded = {
          messageCode: MessageCode.FileDeleted,
          uuid: command.uuid,
          directoryContentsView,
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileDeletionSucceeded, payload)
        );
      },
      error: (error: HttpErrorResponse) => {
        const payload: FileDeletionFailed = {messageCode: resolveMessageCode(error)};
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileDeletionFailed, payload)
        );
      },
    });
  }
}