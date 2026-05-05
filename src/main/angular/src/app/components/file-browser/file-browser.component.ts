import {AfterViewInit, Component, ElementRef, input, OnDestroy, signal, ViewChild, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {VIEW_MODE_KEY, ViewMode} from '../../models/view-mode';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryNavigationCommand, FileCreateCommand} from '../../models/operation-commands';
import {ContextMenuShown, FileCreateFailed} from '../../models/operation-outcomes';
import {MessageCode} from '../../models/message-code';
import {resolveFileIcon} from '../../misc/utils';
import {UserAccountView} from '../../models/user-account-view';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FileBrowser implements AfterViewInit, OnDestroy {

  readonly userAccountView = input<UserAccountView | null>();

  readonly loading = input.required<boolean>();

  readonly fileNodeViews = input<FileNodeView[]>();

  readonly parentDirectoryUuid = input<string | null>(null);

  readonly viewMode: WritableSignal<ViewMode>;

  readonly dropTarget: WritableSignal<boolean>;

  protected readonly ViewMode = ViewMode;

  @ViewChild('fileInput')
  private fileInputRef!: ElementRef<HTMLInputElement>;

  private longPressTimer: number | null;

  private longPressTouch: { x: number; y: number; target: FileNodeView } | null;

  private applicationEventSubscription?: Subscription;

  constructor(private readonly messageBusService: MessageBusService) {
    this.viewMode = signal<ViewMode>(ViewMode.List);
    this.dropTarget = signal(false);
    this.longPressTimer = null;
    this.longPressTouch = null;
  }

  ngAfterViewInit(): void {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === ViewMode.Grid || saved === ViewMode.List) {
      this.viewMode.set(saved);
    }

    this.applicationEventSubscription = this.messageBusService.applicationEventStream
      .subscribe(event => {
        if (event.type === ApplicationEventType.FileUploadPickerShown) {
          this.fileInputRef.nativeElement.click();
        }
      });
  }

  ngOnDestroy(): void {
    this.applicationEventSubscription?.unsubscribe();
    if (this.longPressTimer === null) {
      return;
    }

    window.clearTimeout(this.longPressTimer);
  }

  setViewMode(mode: ViewMode): void {
    if (this.messageBusService.applicationEvenTypeSignal() === ApplicationEventType.ContextMenuShown) {
      this.messageBusService.fireApplicationEventOfType(ApplicationEventType.ContextMenuHidden);
    }

    this.viewMode.set(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  onItemClick(item: FileNodeView): void {
    if (!item.directory) {
      return;
    }

    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.DirectoryNavigationInitiated,
      {uuid: item.uuid} as DirectoryNavigationCommand
    ));
  }

  onItemRightClick(event: MouseEvent, target: FileNodeView): void {
    event.preventDefault();
    event.stopPropagation();
    this.openContextMenu(target, {x: event.clientX, y: event.clientY});
  }

  onItemKebabClick(event: MouseEvent, target: FileNodeView): void {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.openContextMenu(target, {x: rect.right, y: rect.bottom});
  }

  onEmptyAreaRightClick(event: MouseEvent): void {
    if (this.loading()) {
      return;
    }

    event.preventDefault();
    this.openContextMenu(null, {x: event.clientX, y: event.clientY});
  }

  onItemTouchStart(event: TouchEvent, target: FileNodeView): void {
    const touch = event.touches[0];
    this.longPressTouch = {x: touch.clientX, y: touch.clientY, target};
    this.longPressTimer = window.setTimeout(() => this.fireLongPress(), 500);
  }

  onItemTouchEnd(): void {
    if (this.longPressTimer === null) {
      return;
    }

    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
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

  onFileSelectionStarted(event: MouseEvent): void {
    if (event.button !== 0 || event.buttons !== 1) {
      return;
    }

    event.preventDefault();
    this.dropTarget.set(true);
  }

  onFileSelectionCompleted(): void {
    this.dropTarget.set(false);
  }

  getIcon(item: FileNodeView): string {
    if (item.directory) {
      return '/icons/directory.svg';
    }

    const kind = resolveFileIcon(item.name);
    return kind ? `/icons/file-${kind}.svg` : '/icons/file.svg';
  }

  private fireLongPress(): void {
    const touch = this.longPressTouch;
    if (touch === null) {
      return;
    }

    this.openContextMenu(touch.target, {x: touch.x, y: touch.y});
    this.longPressTimer = null;
  }

  private openContextMenu(target: FileNodeView | null,
                          position: { x: number; y: number }): void {
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.ContextMenuShown,
      {
        target,
        position,
        parentUuid: this.parentDirectoryUuid(),
      } as ContextMenuShown
    ));
  }
}
