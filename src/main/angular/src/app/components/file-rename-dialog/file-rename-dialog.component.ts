import {Component, computed, model, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileRenameCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';

@Component({
  selector: 'app-file-rename-dialog',
  templateUrl: './file-rename-dialog.component.html',
  styleUrl: './file-rename-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class FileRenameDialog implements OnInit {

  protected readonly fileName = model('');

  protected readonly errorMessage = model<string | null>(null);

  private readonly selectedFile = computed(
    () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
  );

  constructor(private readonly messageBusService: MessageBusService) {
  }

  ngOnInit(): void {
    this.fileName.set(this.selectedFile()?.name ?? '');
  }

  onConfirm(): void {
    const name = this.fileName().trim();
    if (!name) {
      this.errorMessage.set('File name is required.');
      return;
    }

    if (name.length > 255) {
      this.errorMessage.set('File name must be 255 characters or less.');
      return;
    }

    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.errorMessage.set(null);
    const command: FileRenameCommand = {uuid: file.uuid, name};
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameConfirmed, command)
    );
  }

  onCancel(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.FileRenameCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}