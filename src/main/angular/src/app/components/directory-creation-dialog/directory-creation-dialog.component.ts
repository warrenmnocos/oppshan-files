import {Component, model, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-directory-creation-dialog',
  templateUrl: './directory-creation-dialog.component.html',
  styleUrl: './directory-creation-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class DirectoryCreationDialog {

  readonly confirmed = output<string>();

  readonly cancelled = output<void>();

  protected readonly directoryName = model('');

  protected readonly errorMessage = model<string | null>(null);

  onConfirm(): void {
    const name = this.directoryName().trim();
    if (!name) {
      this.directoryName.set('Untitled directory');
      this.confirmed.emit('Untitled directory');
      return;
    }

    if (name.length > 255) {
      this.errorMessage.set('Directory name must be 255 characters or less.');
      return;
    }

    this.errorMessage.set(null);
    this.confirmed.emit(name);
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
