import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {DirectoryRenameCommand} from '../models/operation-commands';
import {DirectoryRenameFailed, DirectoryRenameSucceeded} from '../models/operation-outcomes';
import {MessageCode} from '../models/message-code';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';

@Injectable()
export class DirectoryRenameConfirmedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.DirectoryRenameConfirmed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as DirectoryRenameCommand;
    this.fileService.renameDirectory(command.uuid, command.name).subscribe({
      next: directoryContentsView => {
        const payload: DirectoryRenameSucceeded = {
          messageCode: MessageCode.DirectoryRenamed,
          uuid: directoryContentsView.uuid,
          name: directoryContentsView.name,
          directoryContentsView: directoryContentsView
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryRenameSucceeded, payload)
        );
      },
      error: (error: HttpErrorResponse) => {
        const payload: DirectoryRenameFailed = {
          messageCode: resolveMessageCode(error)
        };
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.DirectoryRenameFailed, payload)
        );
      },
    });
  }
}
