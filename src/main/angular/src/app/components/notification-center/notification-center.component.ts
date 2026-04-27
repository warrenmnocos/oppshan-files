import {Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NotificationService} from '../../services/notification-service';
import {MessageNotification, ProgressNotification} from '../../models/notification';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
  imports: [TranslatePipe],
})
export class NotificationCenter {

  protected readonly collapsed: WritableSignal<boolean>;

  protected readonly progressNotifications: Signal<readonly ProgressNotification[]>;

  protected readonly messageNotifications: Signal<readonly MessageNotification[]>;

  constructor(private readonly notificationService: NotificationService) {
    this.collapsed = signal(false);
    this.progressNotifications = computed<readonly ProgressNotification[]>(() =>
      this.notificationService.notifications().filter(
        (applicationNotification): applicationNotification is ProgressNotification => applicationNotification.type === 'progress'
      )
    );
    this.messageNotifications = computed<readonly MessageNotification[]>(() =>
      this.notificationService.notifications().filter(
        (applicationNotification): applicationNotification is MessageNotification => applicationNotification.type === 'message'
      )
    );
  }

  protected toggleCollapsed(): void {
    this.collapsed.update(collapsed => !collapsed);
  }

  protected dismissMessage(id: string): void {
    this.notificationService.dismiss(id);
  }

  protected dismissProgress(id: string): void {
    this.notificationService.removeProgress(id);
  }
}
