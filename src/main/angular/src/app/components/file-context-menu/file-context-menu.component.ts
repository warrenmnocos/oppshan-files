import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {FileNodeView} from '../../models/file-node-view';
import {DirectoryNavigationCommand, FileDownloadCommand} from '../../models/operation-commands';
import {ContextMenuShown} from '../../models/operation-outcomes';
import {ContextMenuItem, ContextMenuItemId} from '../../models/context-menu-item';

@Component({
  selector: 'app-file-context-menu',
  templateUrl: './file-context-menu.component.html',
  styleUrl: './file-context-menu.component.scss',
  imports: [TranslatePipe],
})
export class FileContextMenu implements OnInit, OnDestroy {

  @ViewChild('host')
  private hostRef!: ElementRef<HTMLElement>;

  private readonly target: Signal<FileNodeView | null>;
  private readonly rawPosition: Signal<{ x: number; y: number } | null>;
  private readonly parentUuid: Signal<string | null>;
  private readonly quotaExceeded: Signal<boolean>;

  protected readonly items: Signal<readonly ContextMenuItem[]>;

  protected readonly bottomSheet: WritableSignal<boolean>;
  protected readonly clampedPosition: WritableSignal<{ x: number; y: number } | null>;
  protected readonly visible: WritableSignal<boolean>;

  protected readonly ContextMenuItemId = ContextMenuItemId;

  private readonly mediaQuery: MediaQueryList;
  private readonly mediaListener: (event: MediaQueryListEvent) => void;

  constructor(private readonly messageBusService: MessageBusService) {
    const payloadOf = () =>
      this.messageBusService.applicationEventSignal().payload as ContextMenuShown | null;

    this.target = computed(() => payloadOf()?.target ?? null);
    this.rawPosition = computed(() => payloadOf()?.position ?? null);
    this.parentUuid = computed(() => payloadOf()?.parentUuid ?? null);
    this.quotaExceeded = computed(() => payloadOf()?.quotaExceeded ?? false);

    this.items = computed(() => this.resolveItems(this.target(), this.quotaExceeded()));

    this.mediaQuery = window.matchMedia('(max-width: 480px)');
    this.bottomSheet = signal(this.mediaQuery.matches);
    this.mediaListener = (event) => this.bottomSheet.set(event.matches);

    this.clampedPosition = signal<{ x: number; y: number } | null>(null);
    this.visible = signal<boolean>(false);

    afterNextRender(() => this.measureAndShow());
    effect(() => {
      this.target();
      this.measureAndShow();
    });
  }

  ngOnInit(): void {
    this.mediaQuery.addEventListener('change', this.mediaListener);
  }

  ngOnDestroy(): void {
    this.mediaQuery.removeEventListener('change', this.mediaListener);
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointerDown(event: PointerEvent): void {
    if (this.hostRef.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.dismiss();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.dismiss();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.dismiss();
  }

  protected select(item: ContextMenuItem): void {
    if (item.id === ContextMenuItemId.Divider || item.disabled) {
      return;
    }

    const target = this.target();

    switch (item.id) {
      case ContextMenuItemId.Open:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          ApplicationEventType.DirectoryNavigationInitiated,
          {uuid: target!.uuid} as DirectoryNavigationCommand
        ));
        return;
      case ContextMenuItemId.Download:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          ApplicationEventType.FileDownloadConfirmed,
          {uuid: target!.uuid, name: target!.name} as FileDownloadCommand
        ));
        return;
      case ContextMenuItemId.Rename:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          target!.directory
            ? ApplicationEventType.DirectoryRenameInitiated
            : ApplicationEventType.FileRenameInitiated,
          target
        ));
        return;
      case ContextMenuItemId.Properties:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          target!.directory
            ? ApplicationEventType.DirectoryPropertiesShown
            : ApplicationEventType.FilePropertiesShown,
          target
        ));
        return;
      case ContextMenuItemId.Delete:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          target!.directory
            ? ApplicationEventType.DirectoryDeletionInitiated
            : ApplicationEventType.FileDeletionInitiated,
          target
        ));
        return;
      case ContextMenuItemId.NewFolder:
        this.messageBusService.fireApplicationEvent(new ApplicationEvent(
          ApplicationEventType.DirectoryCreateInitiated,
          this.parentUuid()
        ));
        return;
      case ContextMenuItemId.UploadFile:
        this.messageBusService.fireApplicationEventOfType(
          ApplicationEventType.FileUploadPickerShown
        );
        return;
      case ContextMenuItemId.Refresh:
        this.messageBusService.fireApplicationEventOfType(
          ApplicationEventType.DirectoryRefreshInitiated
        );
        return;
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    event.stopPropagation();
    this.dismiss();
  }

  protected rawPositionFallback(): { x: number; y: number } {
    return this.rawPosition() ?? {x: 0, y: 0};
  }

  private dismiss(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.ContextMenuHidden);
  }

  private resolveItems(target: FileNodeView | null, quotaExceeded: boolean): readonly ContextMenuItem[] {
    if (target === null) {
      return [
        {
          id: ContextMenuItemId.Refresh,
          labelKey: 'fileBrowser.contextMenu.refresh',
          iconSrc: '/icons/refresh.svg'
        },
        {
          id: ContextMenuItemId.Divider
        },
        {
          id: ContextMenuItemId.NewFolder,
          labelKey: 'fileBrowser.contextMenu.newFolder',
          iconSrc: '/icons/plus.svg',
          disabled: quotaExceeded
        },
        {
          id: ContextMenuItemId.UploadFile,
          labelKey: 'fileBrowser.contextMenu.uploadFile',
          iconSrc: '/icons/upload.svg',
          disabled: quotaExceeded
        },
      ];
    }

    if (target.directory) {
      return [
        {
          id: ContextMenuItemId.Open,
          labelKey: 'fileBrowser.contextMenu.open',
          iconSrc: '/icons/directory.svg'
        },
        {
          id: ContextMenuItemId.Rename,
          labelKey: 'fileBrowser.contextMenu.rename',
          iconSrc: '/icons/edit.svg'
        },
        {
          id: ContextMenuItemId.Properties,
          labelKey: 'fileBrowser.contextMenu.properties',
          iconSrc: '/icons/info.svg'
        },
        {
          id: ContextMenuItemId.Divider
        },
        {
          id: ContextMenuItemId.Delete,
          labelKey: 'fileBrowser.contextMenu.delete',
          iconSrc: '/icons/delete.svg',
          danger: true
        },
      ];
    }

    return [
      {
        id: ContextMenuItemId.Download,
        labelKey: 'fileBrowser.contextMenu.download',
        iconSrc: '/icons/download.svg'
      },
      {
        id: ContextMenuItemId.Rename,
        labelKey: 'fileBrowser.contextMenu.rename',
        iconSrc: '/icons/edit.svg'
      },
      {
        id: ContextMenuItemId.Properties,
        labelKey: 'fileBrowser.contextMenu.properties',
        iconSrc: '/icons/info.svg'
      },
      {
        id: ContextMenuItemId.Divider
      },
      {
        id: ContextMenuItemId.Delete,
        labelKey: 'fileBrowser.contextMenu.delete',
        iconSrc: '/icons/delete.svg',
        danger: true
      },
    ];
  }

  private measureAndShow(): void {
    if (this.bottomSheet()) {
      this.visible.set(true);
      return;
    }

    const raw = this.rawPosition();
    const host = this.hostRef?.nativeElement;
    if (!raw || !host) {
      this.visible.set(true);
      return;
    }

    const margin = 8;
    const rect = host.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    const x = Math.min(Math.max(raw.x, margin), Math.max(margin, maxX));
    const y = Math.min(Math.max(raw.y, margin), Math.max(margin, maxY));

    this.clampedPosition.set({x, y});
    this.visible.set(true);
  }
}
