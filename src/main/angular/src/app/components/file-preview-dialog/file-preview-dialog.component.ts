import {Component, computed, Signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileDownloadCommand} from '../../models/operation-commands';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';

@Component({
  selector: 'app-file-preview-dialog',
  templateUrl: './file-preview-dialog.component.html',
  styleUrl: './file-preview-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe],
})
export class FilePreviewDialog {

  protected readonly selectedFile: Signal<FileNodeView | null>;

  protected readonly fileName: Signal<string>;

  protected readonly mimeType: Signal<string>;

  protected readonly sizeBytes: Signal<number>;

  constructor(private readonly messageBusService: MessageBusService) {
    this.selectedFile = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
    this.fileName = computed(() => this.selectedFile()?.name ?? '');
    this.mimeType = computed(() => this.selectedFile()?.mimeType ?? '');
    this.sizeBytes = computed(() => this.selectedFile()?.sizeBytes ?? 0);
  }

  onDownload(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(
        ApplicationEventType.FileDownloadConfirmed,
        {
          uuid: file.uuid,
          name: file.name
        } as FileDownloadCommand
      )
    );
    this.onClose();
  }

  onClose(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.FilePreviewCancelled);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }
}
