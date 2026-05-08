import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  Signal,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
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
import {ContextMenuShown, FileCreateFailed, FileNodeSelectionChanged} from '../../models/operation-outcomes';
import {MessageCode} from '../../models/message-code';
import {resolveFileIcon} from '../../misc/utils';
import {UserAccountView} from '../../models/user-account-view';
import {FileService} from '../../services/file-service.service';

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

  readonly quotaExceeded: Signal<boolean>;

  readonly quotaBannerParams: Signal<Record<string, string>>;

  readonly selectedItems: WritableSignal<FileNodeView[]>;

  protected readonly ViewMode = ViewMode;

  @ViewChild('fileInput')
  private fileInputRef!: ElementRef<HTMLInputElement>;

  private longPressTimer: number | null;

  private longPressTouch: { x: number; y: number; target: FileNodeView } | null;

  private longPressFired: boolean;

  private applicationEventSubscription?: Subscription;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly fileService: FileService) {
    this.viewMode = signal<ViewMode>(ViewMode.List);
    this.dropTarget = signal(false);
    this.longPressTimer = null;
    this.longPressTouch = null;
    this.longPressFired = false;
    this.quotaExceeded = computed(() => {
      const account = this.userAccountView();
      if (!account || account.maxStorageBytes === 0) {
        return false;
      }
      return account.usedStorageBytes >= account.maxStorageBytes;
    });
    this.quotaBannerParams = computed(() => {
      const account = this.userAccountView();
      return {
        used: this.fileService.getFileSizeDisplay(account?.usedStorageBytes),
        max: this.fileService.getFileSizeDisplay(account?.maxStorageBytes),
      };
    });
    this.selectedItems = signal<FileNodeView[]>([]);
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

  onItemClick(event: MouseEvent, item: FileNodeView): void {
    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }

    event.stopPropagation();
    this.selectItem(item);
  }

  onItemDoubleClick(event: MouseEvent, item: FileNodeView): void {
    event.stopPropagation();

    if (item.directory) {
      this.messageBusService.fireApplicationEvent(new ApplicationEvent(
        ApplicationEventType.DirectoryNavigationInitiated,
        {uuid: item.uuid} as DirectoryNavigationCommand
      ));
    } else {
      this.messageBusService.fireApplicationEvent(new ApplicationEvent(
        ApplicationEventType.FilePreviewInitiated,
        item
      ));
    }
  }

  onItemRightClick(event: MouseEvent, target: FileNodeView): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectItem(target);
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

  onEmptyAreaClick(): void {
    const previousItems = this.selectedItems();
    if (previousItems.length === 0) {
      return;
    }

    this.selectedItems.set([]);
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.FileNodeSelectionChanged,
      {
        selectedItems: [],
        deselectedItems: previousItems
      } as FileNodeSelectionChanged
    ));
  }

  onItemTouchStart(event: TouchEvent, target: FileNodeView): void {
    this.longPressFired = false;
    const touch = event.touches[0];
    this.longPressTouch = {x: touch.clientX, y: touch.clientY, target};
    this.longPressTimer = window.setTimeout(() => this.fireLongPress(), 500);
  }

  onItemTouchEnd(event?: TouchEvent): void {
    if (this.longPressFired) {
      event?.preventDefault();
    }

    if (this.longPressTimer === null) {
      return;
    }

    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  onDirectoryCreationRequested(): void {
    if (this.quotaExceeded()) {
      return;
    }

    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, this.parentDirectoryUuid())
    );
  }

  onUploadRequested(): void {
    if (this.quotaExceeded()) {
      return;
    }

    this.fileInputRef.nativeElement.click();
  }

  onFilesSelected(files: FileList | File[] | null): void {
    if (!files || files.length === 0) {
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

    for (const file of Array.from(files)) {
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
    if (this.quotaExceeded()) {
      return;
    }

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
      this.onFilesSelected(files);
    }
  }

  onFileSelectionStarted(event: MouseEvent): void {
    if (this.quotaExceeded() || event.button !== 0 || event.buttons !== 1) {
      return;
    }

    event.preventDefault();
    this.dropTarget.set(true);
  }

  onFileSelectionCompleted(): void {
    this.dropTarget.set(false);
  }

  getIcon(fileNodeView: FileNodeView): string {
    if (fileNodeView.directory) {
      return '/icons/directory.svg';
    }

    const kind = resolveFileIcon(fileNodeView.name, fileNodeView.mimeType);
    return kind ? `/icons/file-${kind}.svg` : '/icons/file.svg';
  }

  isSelected(item: FileNodeView): boolean {
    return this.selectedItems().some(selected => selected.uuid === item.uuid);
  }

  private selectItem(item: FileNodeView): void {
    const previousItems = this.selectedItems();
    const alreadySelected = previousItems.some(selected => selected.uuid === item.uuid);
    if (alreadySelected) {
      return;
    }

    this.selectedItems.set([item]);
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.FileNodeSelectionChanged,
      {
        selectedItems: [item],
        deselectedItems: previousItems
      } as FileNodeSelectionChanged
    ));
  }

  private fireLongPress(): void {
    const touch = this.longPressTouch;
    if (touch === null) {
      return;
    }

    this.longPressFired = true;
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
        quotaExceeded: this.quotaExceeded(),
      } as ContextMenuShown
    ));
  }
}
