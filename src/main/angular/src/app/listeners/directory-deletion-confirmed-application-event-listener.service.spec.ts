import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DirectoryDeletionConfirmedApplicationEventListener } from './directory-deletion-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import { DirectoryDeletionFailed, DirectoryDeletionSucceeded } from '../models/operation-outcomes';

describe('DirectoryDeletionConfirmedApplicationEventListener', () => {
  let fileService: { deleteDirectory: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: DirectoryDeletionConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { deleteDirectory: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new DirectoryDeletionConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should call FileService.deleteDirectory and fire a Succeeded event', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'p1', name: 'Parent' });
    fileService.deleteDirectory.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryDeletionConfirmed, { uuid: 'd1' }),
    );

    expect(fileService.deleteDirectory).toHaveBeenCalledWith('d1');
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryDeletionSucceeded);
    const payload = event.payload as DirectoryDeletionSucceeded;
    expect(payload.messageCode).toBe(MessageCode.DirectoryDeleted);
    expect(payload.uuid).toBe('d1');
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire a Failed event with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.Unknown }),
      status: 400,
    });
    fileService.deleteDirectory.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryDeletionConfirmed, { uuid: 'd1' }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryDeletionFailed);
    expect((event.payload as DirectoryDeletionFailed).messageCode).toBe(MessageCode.Unknown);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.DirectoryDeletionInitiated, {}));
    expect(fileService.deleteDirectory).not.toHaveBeenCalled();
  });
});
