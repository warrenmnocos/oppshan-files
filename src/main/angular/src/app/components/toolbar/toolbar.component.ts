import {Component, HostListener, input, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {UserAccountView} from '../../models/user-account-view';
import {StorageBarPipe} from '../../misc/storage-bar.pipe';
import {ApplicationEventType} from '../../models/application-event-type';
import {MessageBusService} from '../../services/message-bus-service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  imports: [TranslatePipe, StorageBarPipe],
})
export class Toolbar {

  readonly userAccountView = input<UserAccountView | null>();

  readonly dropdownOpen: WritableSignal<boolean>;

  protected readonly photoFailed: WritableSignal<boolean>;

  constructor(private readonly messageBusService: MessageBusService) {
    this.dropdownOpen = signal<boolean>(false);
    this.photoFailed = signal(false);
  }

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
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutInitiated);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-trigger') && !target.closest('.profile-dropdown')) {
      this.dropdownOpen.set(false);
    }
  }
}
