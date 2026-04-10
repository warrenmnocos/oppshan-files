import {Component, input, output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FileNodeView} from '../../models/file-node-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {ViewMode} from '../../models/view-mode';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class FileBrowser {

  fileNodeViews = input.required<FileNodeView[]>();

  folderOpened = output<string>();

  viewMode = signal<ViewMode>(ViewMode.List);

  protected readonly ViewMode = ViewMode;

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
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
