import {Component, Signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NotificationService} from '../../services/notification-service';
import {Notification} from '../../models/notification';

@Component({
  selector: 'app-notification-host',
  templateUrl: './notification-host.component.html',
  styleUrl: './notification-host.component.scss',
  imports: [TranslatePipe],
})
export class NotificationHost {

  protected readonly notifications: Signal<readonly Notification[]>;

  constructor(private readonly notificationService: NotificationService,) {
    this.notifications = this.notificationService.notifications
  }

  onDismiss(id: number): void {
    this.notificationService.dismiss(id);
  }
}
