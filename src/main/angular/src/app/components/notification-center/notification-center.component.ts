import {Component, computed, signal} from '@angular/core';
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

  protected readonly collapsed = signal(false);

  protected readonly progressNotifications = computed<readonly ProgressNotification[]>(() =>
    this.notificationService.notifications().filter(
      (applicationNotification): applicationNotification is ProgressNotification => applicationNotification.type === 'progress'
    )
  );

  protected readonly messageNotifications = computed<readonly MessageNotification[]>(() =>
    this.notificationService.notifications().filter(
      (applicationNotification): applicationNotification is MessageNotification => applicationNotification.type === 'message'
    )
  );

  constructor(private readonly notificationService: NotificationService) {
  }

  protected toggleCollapsed(): void {
    this.collapsed.update(c => !c);
  }

  protected dismissMessage(id: string): void {
    this.notificationService.dismiss(id);
  }

  protected dismissProgress(id: string): void {
    this.notificationService.removeProgress(id);
  }
}
