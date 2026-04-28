import {Injectable, Signal, signal, WritableSignal} from '@angular/core';
import {MessageCode} from '../models/message-code';
import {
  ApplicationNotification,
  MessageNotification,
  ProgressKind,
  ProgressNotification,
} from '../models/notification';
import {NotificationDurationMs, resolveSeverity} from '../misc/utils';

@Injectable({providedIn: 'root'})
export class NotificationService {

  readonly notifications: Signal<readonly ApplicationNotification[]>;
  private readonly notificationsSignal: WritableSignal<readonly ApplicationNotification[]>;

  constructor() {
    this.notificationsSignal = signal<readonly ApplicationNotification[]>([]);
    this.notifications = this.notificationsSignal.asReadonly();
  }

  push(messageCode: MessageCode, params?: Record<string, unknown>): void {
    const notification: MessageNotification = {
      type: 'message',
      id: crypto.randomUUID(),
      messageCode,
      severity: resolveSeverity(messageCode),
      params,
    };
    this.notificationsSignal.update(applicationNotifications => [...applicationNotifications, notification]);
    window.setTimeout(() => this.dismiss(notification.id), NotificationDurationMs);
  }

  dismiss(id: string): void {
    this.notificationsSignal.update(applicationNotifications =>
      applicationNotifications.filter(applicationNotification => applicationNotification.id !== id)
    );
  }

  addProgress(kind: ProgressKind, id: string, label: string, params?: Record<string, unknown>): void {
    const entry: ProgressNotification = {type: 'progress', kind, id, label, params, progress: 0};
    this.notificationsSignal.update(applicationNotifications => [...applicationNotifications, entry]);
  }

  updateProgress(id: string, progress: number): void {
    this.notificationsSignal.update(applicationNotifications =>
      applicationNotifications.map(applicationNotification => (applicationNotification.id === id && applicationNotification.type === 'progress')
        ? {...(applicationNotification as ProgressNotification), progress}
        : applicationNotification)
    );
  }

  removeProgress(id: string): void {
    this.notificationsSignal.update(applicationNotifications => applicationNotifications.filter(applicationNotification => applicationNotification.id !== id));
  }
}
