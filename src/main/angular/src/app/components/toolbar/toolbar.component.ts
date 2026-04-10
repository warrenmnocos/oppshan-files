import {Component, HostListener, input, output, signal} from '@angular/core';
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

  userAccountView = input.required<UserAccountView>();

  signOutClicked = output<void>();

  protected dropdownOpen = signal(false);

  protected get initials(): string {
    return ((this.userAccountView().firstName?.charAt(0) ?? '') + (this.userAccountView().lastName?.charAt(0) ?? '')).toUpperCase();
  }

  protected get storagePercent(): number {
    if (this.userAccountView().maxStorageBytes === 0) {
      return 0;
    }

    return Math.round((this.userAccountView().usedStorageBytes / this.userAccountView().maxStorageBytes) * 100);
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
