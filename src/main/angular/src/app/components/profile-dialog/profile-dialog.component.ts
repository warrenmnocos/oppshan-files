import {Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {DateTimePipe} from '../../misc/date-time.pipe';
import {FileSizePipe} from '../../misc/file-size.pipe';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';
import {UserAccountView} from '../../models/user-account-view';

@Component({
  selector: 'app-profile-dialog',
  templateUrl: './profile-dialog.component.html',
  styleUrl: './profile-dialog.component.scss',
  imports: [TranslatePipe, DateTimePipe, FileSizePipe],
})
export class ProfileDialog {

  protected readonly userAccountView: Signal<UserAccountView | null>;
  protected readonly fullName: Signal<string>;
  protected readonly initials: Signal<string>;
  protected readonly photoFailed: WritableSignal<boolean>;

  constructor(private readonly messageBusService: MessageBusService) {
    this.userAccountView = computed(
      () => this.messageBusService.applicationEventSignal().payload as UserAccountView | null
    );
    this.fullName = computed(() => this.userAccountView()?.displayName ?? '');
    this.initials = computed(() => {
      const view = this.userAccountView();
      const fromFirst = view?.firstName?.charAt(0) ?? '';
      const fromLast = view?.lastName?.charAt(0) ?? '';
      if (fromFirst || fromLast) {
        return (fromFirst + fromLast).toUpperCase();
      }

      return (view?.displayName?.charAt(0) ?? '').toUpperCase();
    });
    this.photoFailed = signal(false);
  }

  protected get photoRetrieved(): boolean {
    return !!this.userAccountView()?.photoUrl && !this.photoFailed();
  }

  protected onPhotoError(): void {
    this.photoFailed.set(true);
  }

  protected onClose(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.ProfileHidden);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
