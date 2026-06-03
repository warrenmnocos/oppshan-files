import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { FilePropertiesDialog } from './file-properties-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { FileNodeView } from '../../models/file-node-view';

function makeFile(): FileNodeView {
  const view = new FileNodeView();
  view.uuid = 'file-1';
  view.name = 'report.pdf';
  view.mimeType = 'application/pdf';
  view.sizeBytes = 2048;
  view.directory = false;
  return view;
}

describe('FilePropertiesDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePropertiesDialog],
      providers: [provideTranslateService({ lang: 'en' }), provideRouter([])],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FilePropertiesShown, makeFile()),
    );
  });

  it('should create and surface the selected file fields', () => {
    const fixture = TestBed.createComponent(FilePropertiesDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      fileName: () => string;
      mimeType: () => string;
      sizeBytes: () => number;
    };
    expect(instance.fileName()).toBe('report.pdf');
    expect(instance.mimeType()).toBe('application/pdf');
    expect(instance.sizeBytes()).toBe(2048);
  });

  it('should fire FilePropertiesHidden on close', () => {
    const fixture = TestBed.createComponent(FilePropertiesDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onClose: () => void }).onClose();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.FilePropertiesHidden);
  });
});
