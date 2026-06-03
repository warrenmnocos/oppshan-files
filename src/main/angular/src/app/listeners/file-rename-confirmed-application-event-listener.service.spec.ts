import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FileRenameConfirmedApplicationEventListener } from './file-rename-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import { FileRenameFailed, FileRenameSucceeded } from '../models/operation-outcomes';

describe('FileRenameConfirmedApplicationEventListener', () => {
  let fileService: { renameFile: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: FileRenameConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { renameFile: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new FileRenameConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should call FileService.renameFile and fire a Succeeded event', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'p1' });
    fileService.renameFile.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileRenameConfirmed, {
        uuid: 'f1',
        name: 'new.txt',
      }),
    );

    expect(fileService.renameFile).toHaveBeenCalledWith('f1', 'new.txt');
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.FileRenameSucceeded);
    const payload = event.payload as FileRenameSucceeded;
    expect(payload.messageCode).toBe(MessageCode.FileRenamed);
    expect(payload.uuid).toBe('f1');
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire a Failed event with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.FileNameNotUnique }),
      status: 400,
    });
    fileService.renameFile.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileRenameConfirmed, {
        uuid: 'f1',
        name: 'dup.txt',
      }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.FileRenameFailed);
    expect((event.payload as FileRenameFailed).messageCode).toBe(MessageCode.FileNameNotUnique);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileRenameInitiated, {}));
    expect(fileService.renameFile).not.toHaveBeenCalled();
  });
});
