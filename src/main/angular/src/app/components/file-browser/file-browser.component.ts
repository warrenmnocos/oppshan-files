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
    const dotIndex = item.name.lastIndexOf('.');
    const extension = dotIndex >= 0 ? item.name.slice(dotIndex + 1).toLowerCase() : '';
    const kind = FileBrowser.FILE_ICON_BY_EXTENSION[extension];
    return kind ? `/icons/file-${kind}.svg` : '/icons/file.svg';
  }

  private static readonly FILE_ICON_BY_EXTENSION: Readonly<Record<string, string>> = {
    pdf: 'pdf',

    doc: 'document',
    docx: 'document',
    odt: 'document',
    rtf: 'document',
    pages: 'document',

    xls: 'spreadsheet',
    xlsx: 'spreadsheet',
    ods: 'spreadsheet',
    csv: 'spreadsheet',
    tsv: 'spreadsheet',
    numbers: 'spreadsheet',

    ppt: 'presentation',
    pptx: 'presentation',
    odp: 'presentation',

    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    bmp: 'image',
    tiff: 'image',
    tif: 'image',
    ico: 'image',
    heic: 'image',
    heif: 'image',

    mp3: 'audio',
    wav: 'audio',
    flac: 'audio',
    ogg: 'audio',
    m4a: 'audio',
    aac: 'audio',
    opus: 'audio',
    wma: 'audio',

    mp4: 'video',
    mov: 'video',
    avi: 'video',
    mkv: 'video',
    webm: 'video',
    flv: 'video',
    wmv: 'video',
    m4v: 'video',

    zip: 'archive',
    tar: 'archive',
    gz: 'archive',
    tgz: 'archive',
    bz2: 'archive',
    rar: 'archive',
    '7z': 'archive',
    xz: 'archive',
    zst: 'archive',

    md: 'markdown',
    markdown: 'markdown',
    mdx: 'markdown',

    sql: 'script',
    yml: 'script',
    yaml: 'script',
    properties: 'script',
    sh: 'script',
    bash: 'script',
    zsh: 'script',
    cmd: 'script',
    bat: 'script',
    ps1: 'script',
    js: 'script',
    mjs: 'script',
    cjs: 'script',
    ts: 'script',
    tsx: 'script',
    jsx: 'script',
    py: 'script',
    rb: 'script',
    go: 'script',
    rs: 'script',
    java: 'script',
    kt: 'script',
    c: 'script',
    h: 'script',
    cpp: 'script',
    hpp: 'script',
    cs: 'script',
    php: 'script',
    json: 'script',
    xml: 'script',
    html: 'script',
    htm: 'script',
    css: 'script',
    scss: 'script',
    toml: 'script',
    ini: 'script',
    env: 'script',
    conf: 'script',

    txt: 'text',
    log: 'text',

    key: 'crypto',
    p12: 'crypto',
    pfx: 'crypto',
    cer: 'crypto',
    cert: 'crypto',
    crt: 'crypto',
    pem: 'crypto',
    asc: 'crypto',
    gpg: 'crypto',
  };
}
