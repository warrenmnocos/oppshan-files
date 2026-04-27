import {Component, computed, OnInit, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileService} from '../../services/file-service.service';
import {FileNodeView} from '../../models/file-node-view';
import {FilePropertiesView} from '../../models/file-properties-view';

@Component({
  selector: 'app-file-properties-dialog',
  templateUrl: './file-properties-dialog.component.html',
  styleUrl: './file-properties-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FilePropertiesDialog implements OnInit {

  protected readonly properties = signal<FilePropertiesView | null>(null);

  private readonly selectedFile = computed(
    () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
  );

  constructor(private readonly messageBusService: MessageBusService,
              private readonly fileService: FileService) {
  }

  ngOnInit(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.fileService.getFileProperties(file.uuid).subscribe({
      next: properties => this.properties.set(properties),
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
}