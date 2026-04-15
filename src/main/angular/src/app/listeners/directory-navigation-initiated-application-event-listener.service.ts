import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {ApplicationEventType} from '../models/application-event-type';
import {DirectoryNavigationCommand} from '../models/operation-commands';
import {DirectoryNavigationFailed, DirectoryNavigationSucceeded} from '../models/operation-outcomes';
import {FileService} from '../services/file-service.service';
import {MessageBusService} from '../services/message-bus-service';
import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {resolveMessageCode} from '../misc/utils';
import {MessageCode} from '../models/message-code';

@Injectable()
export class DirectoryNavigationInitiatedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly fileService: FileService,
              private readonly messageBusService: MessageBusService) {
    super(ApplicationEventType.DirectoryNavigationInitiated);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    const command = applicationEvent.payload as DirectoryNavigationCommand;
    if (command.uuid) {
      this.fileService.getDirectoryContents(command.uuid)
        .subscribe({
          next: directoryContentsView => {
            const outcome: DirectoryNavigationSucceeded = {
              messageCode: MessageCode.DirectoryNavigated,
              uuid: command.uuid,
              directoryContentsView: directoryContentsView
            };
            this.messageBusService.fireApplicationEvent(new ApplicationEvent(
              ApplicationEventType.DirectoryNavigationSucceeded,
              outcome
            ));
          },
          error: (error: HttpErrorResponse) => {
            const outcome: DirectoryNavigationFailed = {
              messageCode: resolveMessageCode(error),
              uuid: command.uuid,
            };
            this.messageBusService.fireApplicationEvent(new ApplicationEvent(
              ApplicationEventType.DirectoryNavigationFailed,
              outcome
            ));
          },
        });
      return;
    }

    this.fileService.getDirectoryContentsByPath(command.path ?? '')
      .subscribe({
        next: directoryContentsView => {
          const outcome: DirectoryNavigationSucceeded = {
            messageCode: MessageCode.DirectoryNavigated,
            path: command.path,
            directoryContentsView: directoryContentsView
          };
          this.messageBusService.fireApplicationEvent(new ApplicationEvent(
            ApplicationEventType.DirectoryNavigationSucceeded,
            outcome
          ));
        },
        error: (error: HttpErrorResponse) => {
          const outcome: DirectoryNavigationFailed = {
            messageCode: resolveMessageCode(error),
            path: command.path,
          };
          this.messageBusService.fireApplicationEvent(new ApplicationEvent(
            ApplicationEventType.DirectoryNavigationFailed,
            outcome
          ));
        },
      });
  }
}
