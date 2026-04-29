import {AfterViewInit, Component, ElementRef, input, signal, ViewChild, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {VIEW_MODE_KEY, ViewMode} from '../../models/view-mode';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryNavigationCommand, FileCreateCommand, FileDownloadCommand} from '../../models/operation-commands';
import {FileCreateFailed} from '../../models/operation-outcomes';
import {MessageCode} from '../../models/message-code';
import {resolveFileIcon} from '../../misc/utils';
import {UserAccountView} from '../../models/user-account-view';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FileBrowser implements AfterViewInit {

  readonly userAccountView = input<UserAccountView | null>();

  readonly loading = input.required<boolean>();

  readonly fileNodeViews = input<FileNodeView[]>();

  readonly parentDirectoryUuid = input<string | null>(null);

  readonly viewMode: WritableSignal<ViewMode>;

  readonly dropTarget: WritableSignal<boolean>;

  protected readonly ViewMode = ViewMode;

  @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

  constructor(private readonly messageBusService: MessageBusService) {
    this.viewMode = signal<ViewMode>(ViewMode.List);
    this.dropTarget = signal(false);
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
        {uuid: item.uuid} as DirectoryNavigationCommand
      ));
    }
  }

  onDirectoryCreationRequested(): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, this.parentDirectoryUuid())
    );
  }

  onUploadRequested(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFilesSelected(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const parentUuid = this.parentDirectoryUuid();
    if (!parentUuid) {
      return;
    }

    const maxFileUploadBytes = this.userAccountView()?.maxFileUploadBytes ?? 0;
    const maxStorageBytes = this.userAccountView()?.maxStorageBytes ?? 0;
    const usedStorageBytes = this.userAccountView()?.usedStorageBytes ?? 0;
    const validFiles: File[] = [];
    let projectedUsedBytes = usedStorageBytes;

    for (const file of Array.from(fileList)) {
      if (file.size > maxFileUploadBytes) {
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileCreateFailed, {
            messageCode: MessageCode.FileSizeExceeded,
          } as FileCreateFailed)
        );
      } else if (projectedUsedBytes + file.size > maxStorageBytes) {
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileCreateFailed, {
            messageCode: MessageCode.FileQuotaExceeded,
          } as FileCreateFailed)
        );
      } else {
        projectedUsedBytes += file.size;
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      return;
    }

    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileCreateConfirmed, {
        files: validFiles,
        parentUuid,
      } as FileCreateCommand)
    );
    this.fileInputRef.nativeElement.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dropTarget.set(true);
  }

  onDragLeave(): void {
    this.dropTarget.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropTarget.set(false);
    const items = event.dataTransfer?.items;
    if (!items) {
      return;
    }

    const files: File[] = [];
    for (let index = 0; index < items.length; index++) {
      const entry = items[index].webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        this.messageBusService.fireApplicationEvent(
          new ApplicationEvent(ApplicationEventType.FileCreateFailed, {
            messageCode: MessageCode.FolderUploadRejected,
          } as FileCreateFailed)
        );
        continue;
      }

      const file = items[index].getAsFile();
      if (file) {
        files.push(file);
      }
    }

    if (files.length > 0) {
      this.onFilesSelected(Object.assign([], files) as unknown as FileList);
    }
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

  onFileDownloadRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileDownloadConfirmed, {
        uuid: fileNodeView.uuid,
        name: fileNodeView.name,
      } as FileDownloadCommand)
    );
  }

  onFileRenameRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameInitiated, fileNodeView)
    );
  }

  onFileDeletionRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileDeletionInitiated, fileNodeView)
    );
  }

  onFilePropertiesRequested(fileNodeView: FileNodeView): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FilePropertiesShown, fileNodeView)
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
