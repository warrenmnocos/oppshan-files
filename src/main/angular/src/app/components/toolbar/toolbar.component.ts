import {Component, HostListener, input, model, output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {UserAccountView} from '../../models/user-account-view';
import {StorageBarPipe} from '../../misc/storage-bar.pipe';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  imports: [TranslatePipe, StorageBarPipe],
})
export class Toolbar {

  readonly userAccountView = input<UserAccountView | null>();

  readonly signOutClicked = output<void>();

  readonly dropdownOpen = model<boolean>(false);

  protected readonly photoFailed = signal(false);

  protected get showPhoto(): boolean {
    return !!this.userAccountView()?.photoUrl && !this.photoFailed();
  }

  protected get initials(): string {
    return ((this.userAccountView()?.firstName?.charAt(0) ?? '') + (this.userAccountView()?.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  protected get storagePercent(): number {
    if (!this.userAccountView() || this.userAccountView()!.maxStorageBytes === 0) {
      return 0;
    }

    return Math.round((this.userAccountView()!.usedStorageBytes / this.userAccountView()!.maxStorageBytes) * 100);
  }

  protected onPhotoError(): void {
    this.photoFailed.set(true);
  }

  protected toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  protected signOut(): void {
    this.dropdownOpen.set(false);
    this.signOutClicked.emit();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-trigger') && !target.closest('.profile-dropdown')) {
      this.dropdownOpen.set(false);
    }
  }
}
