import {Injectable, Signal, signal, WritableSignal} from '@angular/core';
import {MessageCode} from '../models/message-code';
import {Notification} from '../models/notification';
import {NotificationDurationMs, resolveSeverity} from '../misc/utils';

@Injectable({providedIn: 'root'})
export class NotificationService {

  readonly notifications: Signal<readonly Notification[]>;
  private readonly notificationsSignal: WritableSignal<readonly Notification[]>;
  private nextId = 1;

  constructor() {
    this.notificationsSignal = signal<readonly Notification[]>([]);
    this.notifications = this.notificationsSignal.asReadonly();
    this.nextId = 1;
  }

  push(messageCode: MessageCode): void {
    const notification: Notification = {
      id: this.nextId++,
      messageCode: messageCode,
      severity: resolveSeverity(messageCode),
    };
    this.notificationsSignal.update(notifications => [...notifications, notification]);
    window.setTimeout(() => this.dismiss(notification.id), NotificationDurationMs);
  }

  dismiss(id: number): void {
    this.notificationsSignal.update(notifications => notifications.filter(notification => notification.id !== id));
  }
}
