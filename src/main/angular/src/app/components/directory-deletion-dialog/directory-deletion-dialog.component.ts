import {Component, computed, OnInit, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryDeletionCommand} from '../../models/operation-commands';
import {FileService} from '../../services/file-service.service';
import {FileNodeView} from '../../models/file-node-view';

@Component({
  selector: 'app-directory-deletion-dialog',
  templateUrl: './directory-deletion-dialog.component.html',
  styleUrl: './directory-deletion-dialog.component.scss',
  imports: [TranslatePipe],
})
export class DirectoryDeletionDialog implements OnInit {

  protected readonly itemCount = signal(0);

  protected readonly selectedDirectory = computed(
    () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
  );

  protected readonly directoryName = computed(() => this.selectedDirectory()?.name ?? '');

  constructor(private readonly messageBusService: MessageBusService,
              private readonly fileService: FileService) {
  }

  ngOnInit(): void {
    const directory = this.selectedDirectory();
    if (!directory) {
      return;
    }
    this.fileService.getDirectoryProperties(directory.uuid).subscribe({
      next: properties => this.itemCount.set(properties.directoryCount + properties.fileCount),
    });
  }

  onConfirm(): void {
    const directory = this.selectedDirectory();
    if (!directory) {
      return;
    }

    const command: DirectoryDeletionCommand = {uuid: directory.uuid};
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryDeletionConfirmed, command)
    );
  }

  onCancel(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.DirectoryDeletionCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}
