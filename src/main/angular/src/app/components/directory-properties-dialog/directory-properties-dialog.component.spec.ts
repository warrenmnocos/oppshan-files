import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DirectoryPropertiesDialog } from './directory-properties-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { FileNodeView } from '../../models/file-node-view';

function makeDirectory(): FileNodeView {
  const view = new FileNodeView();
  view.uuid = 'dir-1';
  view.name = 'Documents';
  view.directory = true;
  return view;
}

describe('DirectoryPropertiesDialog', () => {
  let bus: MessageBusService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectoryPropertiesDialog],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    httpMock = TestBed.inject(HttpTestingController);
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryPropertiesShown, makeDirectory()),
    );
  });

  afterEach(() => httpMock.verify());

  it('should create and load the directory properties', () => {
    const fixture = TestBed.createComponent(DirectoryPropertiesDialog);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/files/dir-1/properties');
    expect(req.request.method).toBe('GET');
    req.flush({
      uuid: 'dir-1',
      name: 'Documents',
      directoryCount: 1,
      fileCount: 2,
      totalSizeBytes: 100,
    });

    const instance = fixture.componentInstance as unknown as {
      properties: () => { fileCount: number } | null;
    };
    expect(instance.properties()?.fileCount).toBe(2);
  });

  it('should fire DirectoryPropertiesHidden on close', () => {
    const fixture = TestBed.createComponent(DirectoryPropertiesDialog);
    fixture.detectChanges();
    httpMock.expectOne('/api/files/dir-1/properties').flush({
      uuid: 'dir-1',
      name: 'Documents',
      directoryCount: 0,
      fileCount: 0,
      totalSizeBytes: 0,
    });
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onClose: () => void }).onClose();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.DirectoryPropertiesHidden);
  });
});
