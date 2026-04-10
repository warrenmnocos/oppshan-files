import {AfterViewInit, Component, input, output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {VIEW_MODE_KEY, ViewMode} from '../../models/view-mode';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FileBrowser implements AfterViewInit {

  loading = input.required<boolean>();

  fileNodeViews = input<FileNodeView[]>();

  folderOpened = output<string>();

  viewMode = signal<ViewMode>(ViewMode.List);

  protected readonly ViewMode = ViewMode;

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
      this.folderOpened.emit(item.uuid);
    }
  }

  getIcon(item: FileNodeView): string {
    return item.directory ? '/icons/folder-teal.svg' : '/icons/file.svg';
  }
}
