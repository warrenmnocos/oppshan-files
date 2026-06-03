import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DirectoryNavigationInitiatedApplicationEventListener } from './directory-navigation-initiated-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import {
  DirectoryNavigationFailed,
  DirectoryNavigationSucceeded,
} from '../models/operation-outcomes';

describe('DirectoryNavigationInitiatedApplicationEventListener', () => {
  let fileService: {
    getDirectoryContents: ReturnType<typeof vi.fn>;
    getDirectoryContentsByPath: ReturnType<typeof vi.fn>;
  };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: DirectoryNavigationInitiatedApplicationEventListener;

  beforeEach(() => {
    fileService = {
      getDirectoryContents: vi.fn(),
      getDirectoryContentsByPath: vi.fn(),
    };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new DirectoryNavigationInitiatedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
  });

  it('should navigate by uuid when the command carries a uuid', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'd1' });
    fileService.getDirectoryContents.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, { uuid: 'd1' }),
    );

    expect(fileService.getDirectoryContents).toHaveBeenCalledWith('d1');
    expect(fileService.getDirectoryContentsByPath).not.toHaveBeenCalled();
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationSucceeded);
    const payload = event.payload as DirectoryNavigationSucceeded;
    expect(payload.messageCode).toBe(MessageCode.DirectoryNavigated);
    expect(payload.uuid).toBe('d1');
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire a Failed event with the uuid on a by-uuid error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.Unknown }),
      status: 400,
    });
    fileService.getDirectoryContents.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, { uuid: 'd1' }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationFailed);
    const payload = event.payload as DirectoryNavigationFailed;
    expect(payload.messageCode).toBe(MessageCode.Unknown);
    expect(payload.uuid).toBe('d1');
  });

  it('should navigate by path when the command has no uuid', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'root' });
    fileService.getDirectoryContentsByPath.mockReturnValue(of(view));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, { path: 'a/b' }),
    );

    expect(fileService.getDirectoryContentsByPath).toHaveBeenCalledWith('a/b');
    expect(fileService.getDirectoryContents).not.toHaveBeenCalled();
    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationSucceeded);
    expect((event.payload as DirectoryNavigationSucceeded).path).toBe('a/b');
  });

  it('should navigate by path with an empty string when neither uuid nor path is set', () => {
    fileService.getDirectoryContentsByPath.mockReturnValue(of(new DirectoryContentsView()));

    listener.onMessage(new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, {}));

    expect(fileService.getDirectoryContentsByPath).toHaveBeenCalledWith('');
  });

  it('should fire a Failed event with the path on a by-path error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.Unknown }),
      status: 400,
    });
    fileService.getDirectoryContentsByPath.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.DirectoryNavigationInitiated, { path: 'a/b' }),
    );

    const event = bus.fireApplicationEvent.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationFailed);
    expect((event.payload as DirectoryNavigationFailed).path).toBe('a/b');
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.DirectoryNavigationSucceeded, {}));
    expect(fileService.getDirectoryContents).not.toHaveBeenCalled();
    expect(fileService.getDirectoryContentsByPath).not.toHaveBeenCalled();
  });
});
