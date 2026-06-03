import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FileDeletionConfirmedApplicationEventListener } from './file-deletion-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import { FileDeletionFailed, FileDeletionSucceeded } from '../models/operation-outcomes';

describe('FileDeletionConfirmedApplicationEventListener', () => {
  let fileService: { deleteFile: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: FileDeletionConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { deleteFile: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new FileDeletionConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should call FileService.deleteFile and fire a Succeeded event', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'p1' });
    fileService.deleteFile.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDeletionConfirmed, { uuid: 'f1' }),
    );

    expect(fileService.deleteFile).toHaveBeenCalledWith('f1');
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.FileDeletionSucceeded);
    const payload = event.payload as FileDeletionSucceeded;
    expect(payload.messageCode).toBe(MessageCode.FileDeleted);
    expect(payload.uuid).toBe('f1');
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire a Failed event with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.Unknown }),
      status: 400,
    });
    fileService.deleteFile.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDeletionConfirmed, { uuid: 'f1' }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.FileDeletionFailed);
    expect((event.payload as FileDeletionFailed).messageCode).toBe(MessageCode.Unknown);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileDeletionInitiated, {}));
    expect(fileService.deleteFile).not.toHaveBeenCalled();
  });
});
