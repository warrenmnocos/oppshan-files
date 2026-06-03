import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DirectoryDeletionDialog } from './directory-deletion-dialog.component';
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

describe('DirectoryDeletionDialog', () => {
  let bus: MessageBusService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectoryDeletionDialog],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    httpMock = TestBed.inject(HttpTestingController);
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryDeletionInitiated, makeDirectory()),
    );
  });

  afterEach(() => httpMock.verify());

  it('should create and fetch the directory properties for the item count', () => {
    const fixture = TestBed.createComponent(DirectoryDeletionDialog);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/files/dir-1/properties');
    expect(req.request.method).toBe('GET');
    req.flush({ uuid: 'dir-1', name: 'Documents', directoryCount: 2, fileCount: 3 });

    const instance = fixture.componentInstance as unknown as { itemCount: () => number };
    expect(instance.itemCount()).toBe(5);
  });

  it('should fire DirectoryDeletionConfirmed with the selected uuid', () => {
    const fixture = TestBed.createComponent(DirectoryDeletionDialog);
    fixture.detectChanges();
    httpMock.expectOne('/api/files/dir-1/properties').flush({
      uuid: 'dir-1',
      name: 'Documents',
      directoryCount: 0,
      fileCount: 0,
    });
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as { onConfirm: () => void }).onConfirm();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.DirectoryDeletionConfirmed,
        payload: { uuid: 'dir-1' },
      }),
    );
  });

  it('should fire DirectoryDeletionCancelled on cancel', () => {
    const fixture = TestBed.createComponent(DirectoryDeletionDialog);
    fixture.detectChanges();
    httpMock.expectOne('/api/files/dir-1/properties').flush({
      uuid: 'dir-1',
      name: 'Documents',
      directoryCount: 0,
      fileCount: 0,
    });
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onCancel: () => void }).onCancel();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.DirectoryDeletionCancelled);
  });
});
