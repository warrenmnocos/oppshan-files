import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { NotificationCenter } from './notification-center.component';
import { NotificationService } from '../../services/notification-service';
import { MessageNotification, ProgressKind, ProgressNotification } from '../../models/notification';
import { MessageCode } from '../../models/message-code';

type Internals = {
  uploadProgressNotifications: () => readonly ProgressNotification[];
  downloadProgressNotifications: () => readonly ProgressNotification[];
  messageNotifications: () => readonly MessageNotification[];
  uploadCollapsed: () => boolean;
  downloadCollapsed: () => boolean;
  toggleUploadCollapsed: () => void;
  toggleDownloadCollapsed: () => void;
  dismissMessage: (id: string) => void;
  dismissProgress: (id: string) => void;
};

describe('NotificationCenter', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationCenter],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    notificationService = TestBed.inject(NotificationService);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NotificationCenter);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should partition notifications into upload, download, and message buckets', () => {
    notificationService.addProgress(ProgressKind.Upload, 'u1', 'up.txt');
    notificationService.addProgress(ProgressKind.Download, 'd1', 'down.txt');
    notificationService.push(MessageCode.FileNotFound);

    const fixture = TestBed.createComponent(NotificationCenter);
    const instance = fixture.componentInstance as unknown as Internals;

    expect(instance.uploadProgressNotifications().map((n) => n.id)).toEqual(['u1']);
    expect(instance.downloadProgressNotifications().map((n) => n.id)).toEqual(['d1']);
    expect(instance.messageNotifications()).toHaveLength(1);
    expect(instance.messageNotifications()[0].messageCode).toBe(MessageCode.FileNotFound);
  });

  it('should toggle the collapsed signals', () => {
    const fixture = TestBed.createComponent(NotificationCenter);
    const instance = fixture.componentInstance as unknown as Internals;

    expect(instance.uploadCollapsed()).toBe(false);
    instance.toggleUploadCollapsed();
    expect(instance.uploadCollapsed()).toBe(true);

    expect(instance.downloadCollapsed()).toBe(false);
    instance.toggleDownloadCollapsed();
    expect(instance.downloadCollapsed()).toBe(true);
  });

  it('should delegate dismissals to the notification service', () => {
    const dismissSpy = vi.spyOn(notificationService, 'dismiss');
    const removeSpy = vi.spyOn(notificationService, 'removeProgress');

    const fixture = TestBed.createComponent(NotificationCenter);
    const instance = fixture.componentInstance as unknown as Internals;

    instance.dismissMessage('m1');
    instance.dismissProgress('p1');

    expect(dismissSpy).toHaveBeenCalledWith('m1');
    expect(removeSpy).toHaveBeenCalledWith('p1');
  });
});
