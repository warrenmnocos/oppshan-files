import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {DirectoryCreateCommand} from '../models/operation-commands';
import {DirectoryCreateFailed, DirectoryCreateSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class DirectoryCreateConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.DirectoryCreateConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as DirectoryCreateCommand;
    this.fileService.createDirectory(command.name, command.parentUuid).subscribe({
      next: view => {
        const payload: DirectoryCreateSucceeded = {
          messageCode: MessageCode.DirectoryCreated,
          uuid: view.uuid,
          name: view.name,
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryCreateSucceeded, payload)
        );
      },
      error: (error: HttpErrorResponse) => {
        const payload: DirectoryCreateFailed = {
          messageCode: resolveMessageCode(error)
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryCreateFailed, payload)
        );
      },
    });
  }
}
