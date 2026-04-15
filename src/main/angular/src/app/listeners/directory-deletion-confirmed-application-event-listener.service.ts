import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {DirectoryDeletionCommand} from '../models/operation-commands';
import {DirectoryDeletionFailed, DirectoryDeletionSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class DirectoryDeletionConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.DirectoryDeletionConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as DirectoryDeletionCommand;
    this.fileService.deleteDirectory(command.uuid).subscribe({
      next: () => {
        const payload: DirectoryDeletionSucceeded = {
          messageCode: MessageCode.DirectoryDeleted,
          uuid: command.uuid,
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryDeletionSucceeded, payload)
        );
      },
      error: (error: HttpErrorResponse) => {
        const payload: DirectoryDeletionFailed = {
          messageCode: resolveMessageCode(error)
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryDeletionFailed, payload)
        );
      },
    });
  }
}
