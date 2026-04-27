import {Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryCreateCommand} from '../../models/operation-commands';

@Component({
  selector: 'app-directory-creation-dialog',
  templateUrl: './directory-creation-dialog.component.html',
  styleUrl: './directory-creation-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class DirectoryCreationDialog {

  protected readonly directoryName: WritableSignal<string>;

  protected readonly errorMessage: WritableSignal<string | null>;

  private readonly parentDirectoryUuid: Signal<string | null>;

  constructor(private readonly messageBusService: MessageBusService) {
    this.directoryName = signal<string>('');
    this.errorMessage = signal<string | null>(null);
    this.parentDirectoryUuid = computed(
      () => this.messageBusService.applicationEventSignal().payload as string | null
    );
  }

  onConfirm(): void {
    const rawName = this.directoryName().trim();
    const name = rawName || 'Untitled directory';
    if (!rawName) {
      this.directoryName.set(name);
    }

    if (name.length > 255) {
      this.errorMessage.set('Directory name must be 255 characters or less.');
      return;
    }

    const parentUuid = this.parentDirectoryUuid();
    if (!parentUuid) {
      return;
    }

    this.errorMessage.set(null);
    const command: DirectoryCreateCommand = {name, parentUuid};
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateConfirmed, command)
    );
  }

  onCancel(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.DirectoryCreateCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}
