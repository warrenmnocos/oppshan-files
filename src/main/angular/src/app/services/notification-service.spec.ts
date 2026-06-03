import { NotificationService } from './notification-service';
import { MessageCode } from '../models/message-code';
import { MessageNotification, ProgressKind, ProgressNotification } from '../models/notification';
import { Severity } from '../models/severity';
import { NotificationDurationMs } from '../misc/utils';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start empty', () => {
    expect(service.notifications()).toEqual([]);
  });

  it('should append a message notification with derived severity on push', () => {
    service.push(MessageCode.FileNotFound);
    const list = service.notifications();
    expect(list).toHaveLength(1);
    const note = list[0] as MessageNotification;
    expect(note.type).toBe('message');
    expect(note.messageCode).toBe(MessageCode.FileNotFound);
    expect(note.severity).toBe(Severity.Error);
  });

  it('should auto-dismiss a pushed message after NotificationDurationMs', () => {
    service.push(MessageCode.DirectoryCreated);
    expect(service.notifications()).toHaveLength(1);
    vi.advanceTimersByTime(NotificationDurationMs);
    expect(service.notifications()).toHaveLength(0);
  });

  it('should remove only the matching id on dismiss', () => {
    service.push(MessageCode.FileNotFound);
    const id = service.notifications()[0].id;
    service.push(MessageCode.DirectoryCreated);
    service.dismiss(id);
    const remaining = service.notifications();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).not.toBe(id);
  });

  it('should add, update, and remove a progress entry', () => {
    service.addProgress(ProgressKind.Upload, 'p1', 'file.txt');
    let entry = service.notifications()[0] as ProgressNotification;
    expect(entry.type).toBe('progress');
    expect(entry.kind).toBe(ProgressKind.Upload);
    expect(entry.progress).toBe(0);

    service.updateProgress('p1', 42);
    entry = service.notifications()[0] as ProgressNotification;
    expect(entry.progress).toBe(42);

    service.removeProgress('p1');
    expect(service.notifications()).toHaveLength(0);
  });
});
