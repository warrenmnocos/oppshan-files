import {Component, computed, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {DirectoryPropertiesView} from '../../models/directory-properties-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileService} from '../../services/file-service.service';
import {FileNodeView} from '../../models/file-node-view';

@Component({
  selector: 'app-directory-properties-dialog',
  templateUrl: './directory-properties-dialog.component.html',
  styleUrl: './directory-properties-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class DirectoryPropertiesDialog implements OnInit {

  protected readonly properties: WritableSignal<DirectoryPropertiesView | null>;

  private readonly selectedDirectory: Signal<FileNodeView | null>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly fileService: FileService) {
    this.properties = signal<DirectoryPropertiesView | null>(null);
    this.selectedDirectory = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
  }

  ngOnInit(): void {
    const directory = this.selectedDirectory();
    if (!directory) {
      return;
    }
    this.fileService.getDirectoryProperties(directory.uuid).subscribe({
      next: properties => this.properties.set(properties),
    });
  }

  onClose(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.DirectoryPropertiesHidden);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }
}
