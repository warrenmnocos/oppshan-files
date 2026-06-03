import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DirectoryCreationDialog } from './directory-creation-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';

describe('DirectoryCreationDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectoryCreationDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DirectoryCreationDialog);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should fire DirectoryCreateConfirmed with the typed name and seeded parent uuid', () => {
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.DirectoryCreateInitiated, 'parent-1'),
    );
    const fixture = TestBed.createComponent(DirectoryCreationDialog);
    fixture.detectChanges();
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    const instance = fixture.componentInstance as unknown as {
      directoryName: { set: (v: string) => void };
      onConfirm: () => void;
    };
    instance.directoryName.set('New Folder');
    instance.onConfirm();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.DirectoryCreateConfirmed,
        payload: { name: 'New Folder', parentUuid: 'parent-1' },
      }),
    );
  });

  it('should fire DirectoryCreateCancelled on cancel', () => {
    const fixture = TestBed.createComponent(DirectoryCreationDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onCancel: () => void }).onCancel();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.DirectoryCreateCancelled);
  });
});
