import {Component, input, model, OnInit, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-directory-rename-dialog',
  templateUrl: './directory-rename-dialog.component.html',
  styleUrl: './directory-rename-dialog.component.scss',
  imports: [FormsModule, TranslatePipe],
})
export class DirectoryRenameDialog implements OnInit {

  readonly currentDirectoryName = input.required<string>();

  readonly confirmed = output<string>();

  readonly cancelled = output<void>();

  protected readonly directoryName = model('');

  protected readonly errorMessage = model<string | null>(null);

  ngOnInit(): void {
    this.directoryName.set(this.currentDirectoryName());
  }

  onConfirm(): void {
    const name = this.directoryName().trim();
    if (!name) {
      this.errorMessage.set('Directory name is required.');
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
