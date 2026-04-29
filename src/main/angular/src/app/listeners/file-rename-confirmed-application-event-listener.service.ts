import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {FileRenameCommand} from '../models/operation-commands';
import {FileRenameFailed, FileRenameSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class FileRenameConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.FileRenameConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as FileRenameCommand;
    this.fileService.renameFile(command.uuid, command.name).subscribe({
      next: directoryContentsView => {
        const payload: FileRenameSucceeded = {
          messageCode: MessageCode.FileRenamed,
          uuid: command.uuid,
          directoryContentsView,
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileRenameSucceeded, payload)
        );
      },
      error: (error: HttpErrorResponse) => {
        const payload: FileRenameFailed = {messageCode: resolveMessageCode(error)};
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileRenameFailed, payload)
        );
      },
    });
  }
}