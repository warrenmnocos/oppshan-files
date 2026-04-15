import {Component, computed, model, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryRenameCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';

@Component({
  selector: 'app-directory-rename-dialog',
  templateUrl: './directory-rename-dialog.component.html',
  styleUrl: './directory-rename-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class DirectoryRenameDialog implements OnInit {

  protected readonly directoryName = model('');

  protected readonly errorMessage = model<string | null>(null);

  private readonly selectedDirectory = computed(
    () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
  );

  constructor(private readonly messageBusService: MessageBusService) {
  }

  ngOnInit(): void {
    this.directoryName.set(this.selectedDirectory()?.name ?? '');
  }

  onConfirm(): void {
    const name = this.directoryName().trim();
    if (!name) {
      this.errorMessage.set('Directory name is required.');
      return;
    }

    if (name.length > 255) {
      this.errorMessage.set('Directory name must be 255 characters or less.');
      return;
    }

    const directory = this.selectedDirectory();
    if (!directory) {
      return;
    }

    this.errorMessage.set(null);
    const command: DirectoryRenameCommand = {uuid: directory.uuid, name};
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameConfirmed, command)
    );
  }

  onCancel(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.DirectoryRenameCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}
