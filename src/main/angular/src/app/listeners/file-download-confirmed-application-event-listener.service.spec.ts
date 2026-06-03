import { of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { FileDownloadConfirmedApplicationEventListener } from './file-download-confirmed-application-event-listener.service';
import { FileService } from '../services/file-service.service';
import { MessageBusService } from '../services/message-bus-service';
import { ApplicationEvent } from '../models/application-event';
import { ApplicationEventType } from '../models/application-event-type';
import { MessageCode } from '../models/message-code';
import {
  FileDownloadFailed,
  FileDownloadInitiated,
  FileDownloadProgressUpdated,
  FileDownloadSucceeded,
} from '../models/operation-outcomes';

function eventsOfType(
  bus: { fireApplicationEvent: ReturnType<typeof vi.fn> },
  type: ApplicationEventType,
): ApplicationEvent[] {
  return bus.fireApplicationEvent.mock.calls
    .map((call) => call[0] as ApplicationEvent)
    .filter((event) => event.type === type);
}

describe('FileDownloadConfirmedApplicationEventListener', () => {
  let fileService: { downloadFile: ReturnType<typeof vi.fn> };
  let bus: { fireApplicationEvent: ReturnType<typeof vi.fn> };
  let listener: FileDownloadConfirmedApplicationEventListener;
  let anchorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fileService = { downloadFile: vi.fn() };
    bus = { fireApplicationEvent: vi.fn() };
    listener = new FileDownloadConfirmedApplicationEventListener(
      fileService as unknown as FileService,
      bus as unknown as MessageBusService,
    );

    vi.spyOn(window.crypto, 'randomUUID').mockReturnValue(
      'id-1' as `${string}-${string}-${string}-${string}-${string}`,
    );
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:url');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    anchorClick = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: anchorClick,
    } as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fire FileDownloadInitiated then progress and trigger a browser save with FileDownloadSucceeded', () => {
    const blob = new Blob(['data']);
    fileService.downloadFile.mockReturnValue(
      of(
        { type: HttpEventType.DownloadProgress, loaded: 25, total: 100 },
        new HttpResponse({ body: blob }),
      ),
    );

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDownloadConfirmed, {
        uuid: 'f1',
        name: 'report.pdf',
      }),
    );

    expect(fileService.downloadFile).toHaveBeenCalledWith('f1');

    const initiated = eventsOfType(bus, ApplicationEventType.FileDownloadInitiated);
    expect(initiated).toHaveLength(1);
    expect((initiated[0].payload as FileDownloadInitiated).id).toBe('id-1');
    expect((initiated[0].payload as FileDownloadInitiated).label).toBe('report.pdf');

    const progress = eventsOfType(bus, ApplicationEventType.FileDownloadProgressUpdated);
    expect(progress).toHaveLength(1);
    expect((progress[0].payload as FileDownloadProgressUpdated).progress).toBe(25);

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');

    const succeeded = eventsOfType(bus, ApplicationEventType.FileDownloadSucceeded);
    expect(succeeded).toHaveLength(1);
    const payload = succeeded[0].payload as FileDownloadSucceeded;
    expect(payload.id).toBe('id-1');
    expect(payload.messageCode).toBe(MessageCode.FileDownloaded);
  });

  it('should fire FileDownloadFailed with the resolved message code on error', () => {
    const error = new HttpErrorResponse({
      headers: new HttpHeaders({ 'X-Message-Code': MessageCode.Unknown }),
      status: 400,
    });
    fileService.downloadFile.mockReturnValue(throwError(() => error));

    listener.onMessage(
      new ApplicationEvent(ApplicationEventType.FileDownloadConfirmed, {
        uuid: 'f1',
        name: 'report.pdf',
      }),
    );

    const failed = eventsOfType(bus, ApplicationEventType.FileDownloadFailed);
    expect(failed).toHaveLength(1);
    const payload = failed[0].payload as FileDownloadFailed;
    expect(payload.id).toBe('id-1');
    expect(payload.messageCode).toBe(MessageCode.Unknown);
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should ignore unrelated event types', () => {
    listener.onMessage(new ApplicationEvent(ApplicationEventType.FileDownloadSucceeded, {}));
    expect(fileService.downloadFile).not.toHaveBeenCalled();
  });
});
