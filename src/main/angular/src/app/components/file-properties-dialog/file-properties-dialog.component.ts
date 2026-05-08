import {Component, computed, Signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileNodeView} from '../../models/file-node-view';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-file-properties-dialog',
  templateUrl: './file-properties-dialog.component.html',
  styleUrl: './file-properties-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FilePropertiesDialog {

  protected readonly selectedFile: Signal<FileNodeView | null>;

  protected readonly fileName: Signal<string>;

  protected readonly mimeType: Signal<string>;

  protected readonly sizeBytes: Signal<number>;

  protected readonly location: Signal<string>;

  protected readonly fileUrl: Signal<string>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly route: ActivatedRoute) {
    this.selectedFile = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
    this.fileName = computed(() => this.selectedFile()?.name ?? '');
    this.mimeType = computed(() => this.selectedFile()?.mimeType ?? '');
    this.sizeBytes = computed(() => this.selectedFile()?.sizeBytes ?? 0);
    this.location = computed(() => {
      const path = this.route.snapshot.url
        .map(segment => decodeURIComponent(segment.path))
        .join('/');
      return path.length > 0
        ? 'My files / ' + path.split('/').join(' / ')
        : 'My files';
    });
    this.fileUrl = computed(() => {
      const uuid = this.selectedFile()?.uuid ?? '';
      return `${window.location.origin}/drive/${uuid}`;
    });
  }

  onClose(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.FilePropertiesHidden);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
