import {Component, computed, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {DirectoryPropertiesView} from '../../models/directory-properties-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileService} from '../../services/file-service.service';
import {FileNodeView} from '../../models/file-node-view';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-directory-properties-dialog',
  templateUrl: './directory-properties-dialog.component.html',
  styleUrl: './directory-properties-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class DirectoryPropertiesDialog implements OnInit {

  protected readonly properties: WritableSignal<DirectoryPropertiesView | null>;

  protected readonly location: Signal<string>;

  protected readonly directoryUrl: Signal<string>;

  private readonly selectedDirectory: Signal<FileNodeView | null>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly fileService: FileService,
              private readonly route: ActivatedRoute) {
    this.properties = signal<DirectoryPropertiesView | null>(null);
    this.selectedDirectory = computed(
      () => this.messageBusService.applicationEventSignal().payload as FileNodeView | null
    );
    this.location = computed(() => {
      const path = this.route.snapshot.url
        .map(segment => decodeURIComponent(segment.path))
        .join('/');
      return path.length > 0
        ? 'My files / ' + path.split('/').join(' / ')
        : 'My files';
    });
    this.directoryUrl = computed(() => {
      const uuid = this.selectedDirectory()?.uuid ?? '';
      return `${window.location.origin}/drive/${uuid}`;
    });
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
