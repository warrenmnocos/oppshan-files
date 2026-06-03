import { OperationProgressApplicationEventListener } from './operation-progress-application-event-listener.service';
import { NotificationService } from '../services/notification-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { ProgressKind } from '../models/notification';

describe('OperationProgressApplicationEventListener', () => {
  let notificationService: {
    addProgress: ReturnType<typeof vi.fn>;
    updateProgress: ReturnType<typeof vi.fn>;
    removeProgress: ReturnType<typeof vi.fn>;
  };
  let listener: OperationProgressApplicationEventListener;

  beforeEach(() => {
    notificationService = {
      addProgress: vi.fn(),
      updateProgress: vi.fn(),
      removeProgress: vi.fn(),
    };
    listener = new OperationProgressApplicationEventListener(
      notificationService as unknown as NotificationService,
    );
  });

  it('should add an upload progress entry on FileUploadInitiated', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadInitiated, {
        id: 'u1',
        label: 'a.txt',
        params: { size: 10 },
      }),
    );
    expect(notificationService.addProgress).toHaveBeenCalledWith(
      ProgressKind.Upload,
      'u1',
      'a.txt',
      { size: 10 },
    );
  });

  it('should update progress on FileUploadProgressUpdated', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadProgressUpdated, {
        id: 'u1',
        progress: 42,
      }),
    );
    expect(notificationService.updateProgress).toHaveBeenCalledWith('u1', 42);
  });

  it('should remove the progress entry on FileUploadSucceeded', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadSucceeded, { id: 'u1' }),
    );
    expect(notificationService.removeProgress).toHaveBeenCalledWith('u1');
  });

  it('should remove the progress entry on FileUploadFailed', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileUploadFailed, { id: 'u1' }));
    expect(notificationService.removeProgress).toHaveBeenCalledWith('u1');
  });

  it('should add a download progress entry on FileDownloadInitiated', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDownloadInitiated, {
        id: 'd1',
        label: 'b.pdf',
      }),
    );
    expect(notificationService.addProgress).toHaveBeenCalledWith(
      ProgressKind.Download,
      'd1',
      'b.pdf',
      undefined,
    );
  });

  it('should update progress on FileDownloadProgressUpdated', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDownloadProgressUpdated, {
        id: 'd1',
        progress: 77,
      }),
    );
    expect(notificationService.updateProgress).toHaveBeenCalledWith('d1', 77);
  });

  it('should remove the progress entry on FileDownloadSucceeded', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDownloadSucceeded, { id: 'd1' }),
    );
    expect(notificationService.removeProgress).toHaveBeenCalledWith('d1');
  });

  it('should remove the progress entry on FileDownloadFailed', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileDownloadFailed, { id: 'd1' }));
    expect(notificationService.removeProgress).toHaveBeenCalledWith('d1');
  });

  it('should drive a full upload add/update/remove lifecycle in order', () => {
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadInitiated, { id: 'u1', label: 'a.txt' }),
    );
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadProgressUpdated, {
        id: 'u1',
        progress: 50,
      }),
    );
    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileUploadSucceeded, { id: 'u1' }),
    );

    expect(notificationService.addProgress).toHaveBeenCalledTimes(1);
    expect(notificationService.updateProgress).toHaveBeenCalledTimes(1);
    expect(notificationService.removeProgress).toHaveBeenCalledTimes(1);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileCreateConfirmed, { id: 'x' }));
    expect(notificationService.addProgress).not.toHaveBeenCalled();
    expect(notificationService.updateProgress).not.toHaveBeenCalled();
    expect(notificationService.removeProgress).not.toHaveBeenCalled();
  });
});
