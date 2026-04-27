import {Component, computed} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileDeletionCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';

@Component({
  selector: 'app-file-deletion-dialog',
  templateUrl: './file-deletion-dialog.component.html',
  styleUrl: './file-deletion-dialog.component.scss',
  imports: [TranslatePipe],
})
export class FileDeletionDialog {

  protected readonly selectedFile = computed(
    () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
  );

  protected readonly fileName = computed(() => this.selectedFile()?.name ?? '');

  constructor(private readonly messageBusService: MessageBusService) {
  }

  onConfirm(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    const command: FileDeletionCommand = {uuid: file.uuid};
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileDeletionConfirmed, command)
    );
  }

  onCancel(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.FileDeletionCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}