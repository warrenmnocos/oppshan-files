import {Component, computed, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryRenameCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';
import {MessageCode} from '../../models/message-code';

@Component({
  selector: 'app-directory-rename-dialog',
  templateUrl: './directory-rename-dialog.component.html',
  styleUrl: './directory-rename-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class DirectoryRenameDialog implements OnInit {

  protected readonly directoryName: WritableSignal<string>;

  protected readonly errorMessage: WritableSignal<string | null>;

  private readonly selectedDirectory: Signal<FileNodeView | null>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly translateService: TranslateService) {
    this.directoryName = signal<string>('');
    this.errorMessage = signal<string | null>(null);
    this.selectedDirectory = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
  }

  ngOnInit(): void {
    this.directoryName.set(this.selectedDirectory()?.name ?? '');
  }

  onConfirm(): void {
    const name = this.directoryName().trim();
    if (!name) {
      this.errorMessage.set(this.translateService.instant(MessageCode.DirectoryNameRequired));
      return;
    }

    if (name.length > 255) {
      this.errorMessage.set(this.translateService.instant(MessageCode.DirectoryNameTooLong));
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

  onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
