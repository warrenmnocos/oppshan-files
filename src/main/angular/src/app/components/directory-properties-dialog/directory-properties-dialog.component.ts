import {Component, input, output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {DirectoryPropertiesView} from '../../models/directory-properties-view';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {DateTimePipe} from '../../misc/date-time.pipe';

@Component({
  selector: 'app-directory-properties-dialog',
  templateUrl: './directory-properties-dialog.component.html',
  styleUrl: './directory-properties-dialog.component.scss',
  imports: [TranslatePipe, FileSizePipe, DateTimePipe],
})
export class DirectoryPropertiesDialog {

  readonly properties = input.required<DirectoryPropertiesView>();

  readonly closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }
}
