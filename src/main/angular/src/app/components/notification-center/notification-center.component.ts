import {Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NotificationService} from '../../services/notification-service';
import {MessageNotification, ProgressKind, ProgressNotification} from '../../models/notification';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
  imports: [TranslatePipe],
})
export class NotificationCenter {

  protected readonly uploadCollapsed: WritableSignal<boolean>;

  protected readonly downloadCollapsed: WritableSignal<boolean>;

  protected readonly uploadProgressNotifications: Signal<readonly ProgressNotification[]>;

  protected readonly downloadProgressNotifications: Signal<readonly ProgressNotification[]>;

  protected readonly messageNotifications: Signal<readonly MessageNotification[]>;

  constructor(private readonly notificationService: NotificationService) {
    this.uploadCollapsed = signal(false);
    this.downloadCollapsed = signal(false);
    this.uploadProgressNotifications = computed<readonly ProgressNotification[]>(() =>
      this.notificationService.notifications().filter(
        (applicationNotification): applicationNotification is ProgressNotification =>
          applicationNotification.type === 'progress'
          && (applicationNotification as ProgressNotification).kind === ProgressKind.Upload
      )
    );
    this.downloadProgressNotifications = computed<readonly ProgressNotification[]>(() =>
      this.notificationService.notifications().filter(
        (applicationNotification): applicationNotification is ProgressNotification =>
          applicationNotification.type === 'progress'
          && (applicationNotification as ProgressNotification).kind === ProgressKind.Download
      )
    );
    this.messageNotifications = computed<readonly MessageNotification[]>(() =>
      this.notificationService.notifications().filter(
        (applicationNotification): applicationNotification is MessageNotification => applicationNotification.type === 'message'
      )
    );
  }

  protected toggleUploadCollapsed(): void {
    this.uploadCollapsed.update(collapsed => !collapsed);
  }

  protected toggleDownloadCollapsed(): void {
    this.downloadCollapsed.update(collapsed => !collapsed);
  }

  protected dismissMessage(id: string): void {
    this.notificationService.dismiss(id);
  }

  protected dismissProgress(id: string): void {
    this.notificationService.removeProgress(id);
  }
}
