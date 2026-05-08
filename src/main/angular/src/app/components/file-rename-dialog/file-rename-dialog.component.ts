import {Component, computed, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileRenameCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';
import {MessageCode} from '../../models/message-code';

@Component({
  selector: 'app-file-rename-dialog',
  templateUrl: './file-rename-dialog.component.html',
  styleUrl: './file-rename-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class FileRenameDialog implements OnInit {

  protected readonly fileName: WritableSignal<string>;

  protected readonly errorMessage: WritableSignal<string | null>;

  private readonly selectedFile: Signal<FileNodeView | null>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly translateService: TranslateService) {
    this.fileName = signal<string>('');
    this.errorMessage = signal<string | null>(null);
    this.selectedFile = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
  }

  ngOnInit(): void {
    this.fileName.set(this.selectedFile()?.name ?? '');
  }

  onConfirm(): void {
    const name = this.fileName().trim();
    if (!name) {
      this.errorMessage.set(this.translateService.instant(MessageCode.FileNameRequired));
      return;
    }

    if (name.length > 255) {
      this.errorMessage.set(this.translateService.instant(MessageCode.FileNameTooLong));
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

  onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
