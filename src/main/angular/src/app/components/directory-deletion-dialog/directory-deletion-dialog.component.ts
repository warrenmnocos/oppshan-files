import {Component, input, output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-directory-deletion-dialog',
  templateUrl: './directory-deletion-dialog.component.html',
  styleUrl: './directory-deletion-dialog.component.scss',
  imports: [TranslatePipe],
})
export class DirectoryDeletionDialog {

  readonly directoryName = input.required<string>();

  readonly itemCount = input<number>(0);

  readonly confirmed = output<void>();

  readonly cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}
