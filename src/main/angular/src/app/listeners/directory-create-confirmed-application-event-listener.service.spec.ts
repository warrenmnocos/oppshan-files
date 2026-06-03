import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DirectoryCreateConfirmedApplicationEventListener } from './directory-create-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import { DirectoryCreateFailed, DirectoryCreateSucceeded } from '../models/operation-outcomes';

describe('DirectoryCreateConfirmedApplicationEventListener', () => {
  let fileService: { createDirectory: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: DirectoryCreateConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { createDirectory: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new DirectoryCreateConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should call FileService.createDirectory with the command and fire a Succeeded event', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'd1', name: 'Reports' });
    fileService.createDirectory.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateConfirmed, {
        name: 'Reports',
        parentUuid: 'p1',
      }),
    );

    expect(fileService.createDirectory).toHaveBeenCalledWith('Reports', 'p1');
    expect(bus.fireApplicationEvent).toHaveBeenCalledTimes(1);
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryCreateSucceeded);
    const payload = event.payload as DirectoryCreateSucceeded;
    expect(payload.messageCode).toBe(MessageCode.DirectoryCreated);
    expect(payload.uuid).toBe('d1');
    expect(payload.name).toBe('Reports');
  });

  it('should fire a Failed event with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.DirectoryNameNotUnique }),
      status: 400,
    });
    fileService.createDirectory.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateConfirmed, {
        name: 'Dup',
        parentUuid: 'p1',
      }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryCreateFailed);
    expect((event.payload as DirectoryCreateFailed).messageCode).toBe(
      MessageCode.DirectoryNameNotUnique,
    );
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, {}));
    expect(fileService.createDirectory).not.toHaveBeenCalled();
  });
});
