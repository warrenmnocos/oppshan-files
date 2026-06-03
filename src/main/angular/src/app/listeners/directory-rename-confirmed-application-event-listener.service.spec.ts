import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DirectoryRenameConfirmedApplicationEventListener } from './directory-rename-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import { DirectoryRenameFailed, DirectoryRenameSucceeded } from '../models/operation-outcomes';

describe('DirectoryRenameConfirmedApplicationEventListener', () => {
  let fileService: { renameDirectory: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: DirectoryRenameConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { renameDirectory: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new DirectoryRenameConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should call FileService.renameDirectory and fire a Succeeded event from the returned view', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'd1', name: 'Renamed' });
    fileService.renameDirectory.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameConfirmed, {
        uuid: 'd1',
        name: 'Renamed',
      }),
    );

    expect(fileService.renameDirectory).toHaveBeenCalledWith('d1', 'Renamed');
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryRenameSucceeded);
    const payload = event.payload as DirectoryRenameSucceeded;
    expect(payload.messageCode).toBe(MessageCode.DirectoryRenamed);
    expect(payload.uuid).toBe('d1');
    expect(payload.name).toBe('Renamed');
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire a Failed event with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.DirectoryNameNotUnique }),
      status: 400,
    });
    fileService.renameDirectory.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameConfirmed, {
        uuid: 'd1',
        name: 'Dup',
      }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryRenameFailed);
    expect((event.payload as DirectoryRenameFailed).messageCode).toBe(
      MessageCode.DirectoryNameNotUnique,
    );
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, {}));
    expect(fileService.renameDirectory).not.toHaveBeenCalled();
  });
});
