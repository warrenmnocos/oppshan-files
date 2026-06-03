import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { FileCreateConfirmedApplicationEventListener } from './file-create-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import { DirectoryContentsView } from '../models/directory-contents-view';
import {
  FileCreateFailed,
  FileCreateSucceeded,
  FileUploadFailed,
  FileUploadInitiated,
  FileUploadProgressUpdated,
  FileUploadSucceeded,
} from '../models/operation-outcomes';

function eventsOfType(
  bus: { fireApplicationEvent: ReturnType<typeof vi.fn> },
  type: ApplicationEventType,
): ApplicationEvent[] {
  return bus.fireApplicationEvent.mock.calls
    .map((call) => call[0] as ApplicationEvent)
    .filter((event) => event.type === type);
}

describe('FileCreateConfirmedApplicationEventListener', () => {
  let fileService: { uploadFile: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: FileCreateConfirmedApplicationEventListener;

  beforeEach(() => {
    fileService = { uploadFile: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new FileCreateConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );
    let counter = 0;
    vi.spyOn(window.crypto, 'randomUUID').mockImplementation(
      () => `id-${++counter}` as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fire FileUploadInitiated then progress, FileUploadSucceeded and FileCreateSucceeded on success', () => {
    const view = Object.assign(new DirectoryContentsView(), { uuid: 'p1' });
    const file = new File(['hello'], 'hello.txt');
    fileService.uploadFile.mockReturnValue(
      of(
        { type: HttpEventType.UploadProgress, loaded: 50, total: 100 },
        new HttpResponse({ body: view }),
      ),
    );

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileCreateConfirmed, {
        files: [file],
        parentUuid: 'parent',
      }),
    );

    expect(fileService.uploadFile).toHaveBeenCalledWith('parent', file);

    const initiated = eventsOfType(bus, ApplicationEventType.FileUploadInitiated);
    expect(initiated).toHaveLength(1);
    expect((initiated[0].payload as FileUploadInitiated).id).toBe('id-1');
    expect((initiated[0].payload as FileUploadInitiated).label).toBe('hello.txt');

    const progress = eventsOfType(bus, ApplicationEventType.FileUploadProgressUpdated);
    expect(progress).toHaveLength(1);
    expect((progress[0].payload as FileUploadProgressUpdated).id).toBe('id-1');
    expect((progress[0].payload as FileUploadProgressUpdated).progress).toBe(50);

    const uploadSucceeded = eventsOfType(bus, ApplicationEventType.FileUploadSucceeded);
    expect(uploadSucceeded).toHaveLength(1);
    expect((uploadSucceeded[0].payload as FileUploadSucceeded).directoryContentsView).toBe(view);

    const createSucceeded = eventsOfType(bus, ApplicationEventType.FileCreateSucceeded);
    expect(createSucceeded).toHaveLength(1);
    const payload = createSucceeded[0].payload as FileCreateSucceeded;
    expect(payload.messageCode).toBe(MessageCode.FileUploaded);
    expect(payload.directoryContentsView).toBe(view);
  });

  it('should fire FileUploadFailed and FileCreateFailed with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.FileNameNotUnique }),
      status: 400,
    });
    fileService.uploadFile.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileCreateConfirmed, {
        files: [new File(['x'], 'dup.txt')],
        parentUuid: 'parent',
      }),
    );

    const uploadFailed = eventsOfType(bus, ApplicationEventType.FileUploadFailed);
    expect(uploadFailed).toHaveLength(1);
    expect((uploadFailed[0].payload as FileUploadFailed).id).toBe('id-1');
    expect((uploadFailed[0].payload as FileUploadFailed).messageCode).toBe(
      MessageCode.FileNameNotUnique,
    );

    const createFailed = eventsOfType(bus, ApplicationEventType.FileCreateFailed);
    expect(createFailed).toHaveLength(1);
    expect((createFailed[0].payload as FileCreateFailed).messageCode).toBe(
      MessageCode.FileNameNotUnique,
    );
  });

  it('should upload each file in the command independently', () => {
    fileService.uploadFile.mockReturnValue(
      of(new HttpResponse({ body: new DirectoryContentsView() })),
    );

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileCreateConfirmed, {
        files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')],
        parentUuid: 'parent',
      }),
    );

    expect(fileService.uploadFile).toHaveBeenCalledTimes(2);
    expect(eventsOfType(bus, ApplicationEventType.FileUploadInitiated)).toHaveLength(2);
    expect(eventsOfType(bus, ApplicationEventType.FileCreateSucceeded)).toHaveLength(2);
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileCreateInitiated, {}));
    expect(fileService.uploadFile).not.toHaveBeenCalled();
  });
});
