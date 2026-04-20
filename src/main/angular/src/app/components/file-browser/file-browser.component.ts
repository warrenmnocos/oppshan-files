import {AfterViewInit, Component, input, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {VIEW_MODE_KEY, ViewMode} from '../../models/view-mode';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryNavigationCommand} from '../../models/operation-commands';
import {resolveFileIcon} from '../../misc/utils';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FileBrowser implements AfterViewInit {

  loading = input.required<boolean>();

  fileNodeViews = input<FileNodeView[]>();

  parentDirectoryUuid = input<string | null>(null);

  viewMode = signal<ViewMode>(ViewMode.List);

  protected readonly ViewMode = ViewMode;

  constructor(private readonly messageBusService: MessageBusService) {
  }

  ngAfterViewInit(): void {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === ViewMode.Grid || saved === ViewMode.List) {
      this.viewMode.set(saved);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  onItemClick(item: FileNodeView): void {
    if (item.directory) {
      this.messageBusService.fireApplicationEvent(new ApplicationEvent(
        ApplicationEventType.DirectoryNavigationInitiated,
        {
          uuid: item.uuid,
        } as DirectoryNavigationCommand
      ));
    }
  }

  onDirectoryCreationRequested(): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, this.parentDirectoryUuid())
    );
  }

  onDirectoryRenameRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, fileNodeView)
    );
  }

  onDirectoryDeletionRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryDeletionInitiated, fileNodeView)
    );
  }

  onDirectoryPropertiesRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryPropertiesShown, fileNodeView)
    );
  }

  getIcon(item: FileNodeView): string {
    if (item.directory) {
      return '/icons/directory.svg';
    }

    const kind = resolveFileIcon(item.name);
    return kind ? `/icons/file-${kind}.svg` : '/icons/file.svg';
  }
}
