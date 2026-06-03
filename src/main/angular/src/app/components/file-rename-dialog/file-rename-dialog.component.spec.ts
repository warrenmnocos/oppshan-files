import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FileRenameDialog } from './file-rename-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { FileNodeView } from '../../models/file-node-view';

function makeFile(): FileNodeView {
  const view = new FileNodeView();
  view.uuid = 'file-1';
  view.name = 'report.pdf';
  view.directory = false;
  return view;
}

describe('FileRenameDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileRenameDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
  });

  it('should create', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameInitiated, makeFile()),
    );
    const fixture = TestBed.createComponent(FileRenameDialog);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should seed the name field from the selected file on init', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameInitiated, makeFile()),
    );
    const fixture = TestBed.createComponent(FileRenameDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { fileName: () => string };
    expect(instance.fileName()).toBe('report.pdf');
  });

  it('should fire FileRenameConfirmed with the new name and selected uuid', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameInitiated, makeFile()),
    );
    const fixture = TestBed.createComponent(FileRenameDialog);
    fixture.detectChanges();
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    const instance = fixture.componentInstance as unknown as {
      fileName: { set: (v: string) => void };
      onConfirm: () => void;
    };
    instance.fileName.set('renamed.pdf');
    instance.onConfirm();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.FileRenameConfirmed,
        payload: { uuid: 'file-1', name: 'renamed.pdf' },
      }),
    );
  });

  it('should fire FileRenameCancelled on cancel', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileRenameInitiated, makeFile()),
    );
    const fixture = TestBed.createComponent(FileRenameDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onCancel: () => void }).onCancel();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.FileRenameCancelled);
  });
});
