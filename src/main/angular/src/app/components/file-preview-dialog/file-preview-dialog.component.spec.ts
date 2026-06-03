import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FilePreviewDialog } from './file-preview-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { FileNodeView } from '../../models/file-node-view';

function makeFile(): FileNodeView {
  const view = new FileNodeView();
  view.uuid = 'file-1';
  view.name = 'photo.png';
  view.mimeType = 'image/png';
  view.sizeBytes = 4096;
  view.directory = false;
  return view;
}

describe('FilePreviewDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FilePreviewInitiated, makeFile()),
    );
  });

  it('should create and surface the selected file fields', () => {
    const fixture = TestBed.createComponent(FilePreviewDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      fileName: () => string;
      mimeType: () => string;
      sizeBytes: () => number;
    };
    expect(instance.fileName()).toBe('photo.png');
    expect(instance.mimeType()).toBe('image/png');
    expect(instance.sizeBytes()).toBe(4096);
  });

  it('should fire FileDownloadConfirmed with the file uuid and name on download', () => {
    const fixture = TestBed.createComponent(FilePreviewDialog);
    fixture.detectChanges();
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as { onDownload: () => void }).onDownload();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.FileDownloadConfirmed,
        payload: { uuid: 'file-1', name: 'photo.png' },
      }),
    );
  });

  it('should fire FilePreviewCancelled on close', () => {
    const fixture = TestBed.createComponent(FilePreviewDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onClose: () => void }).onClose();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.FilePreviewCancelled);
  });
});
