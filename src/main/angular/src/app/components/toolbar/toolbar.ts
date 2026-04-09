import {Component, HostListener, input, output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {UserAccountView} from '../../models/user-account-view';
import {StorageBarPipe} from '../../misc/storage-bar.pipe';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  imports: [TranslatePipe, StorageBarPipe],
})
export class Toolbar {
  user = input.required<UserAccountView>();
  signOutClicked = output<void>();

  protected dropdownOpen = signal(false);

  protected get initials(): string {
    const u = this.user();
    return ((u.firstName?.charAt(0) ?? '') + (u.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  protected get storagePercent(): number {
    const u = this.user();
    if (u.maxStorageBytes === 0) return 0;
    return Math.round((u.usedStorageBytes / u.maxStorageBytes) * 100);
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