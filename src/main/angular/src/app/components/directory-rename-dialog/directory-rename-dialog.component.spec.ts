import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DirectoryRenameDialog } from './directory-rename-dialog.component';
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

describe('DirectoryRenameDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectoryRenameDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
  });

  it('should create', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, makeDirectory()),
    );
    const fixture = TestBed.createComponent(DirectoryRenameDialog);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should seed the name field from the selected directory on init', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, makeDirectory()),
    );
    const fixture = TestBed.createComponent(DirectoryRenameDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { directoryName: () => string };
    expect(instance.directoryName()).toBe('Documents');
  });

  it('should fire DirectoryRenameConfirmed with the new name and selected uuid', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, makeDirectory()),
    );
    const fixture = TestBed.createComponent(DirectoryRenameDialog);
    fixture.detectChanges();
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    const instance = fixture.componentInstance as unknown as {
      directoryName: { set: (v: string) => void };
      onConfirm: () => void;
    };
    instance.directoryName.set('Renamed');
    instance.onConfirm();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.DirectoryRenameConfirmed,
        payload: { uuid: 'dir-1', name: 'Renamed' },
      }),
    );
  });

  it('should fire DirectoryRenameCancelled on cancel', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryRenameInitiated, makeDirectory()),
    );
    const fixture = TestBed.createComponent(DirectoryRenameDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onCancel: () => void }).onCancel();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.DirectoryRenameCancelled);
  });
});
