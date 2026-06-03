import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FileDeletionDialog } from './file-deletion-dialog.component';
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

describe('FileDeletionDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileDeletionDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    bus.fireApplicationEvent(
      new ApplicationEvent(ApplicationEventType.FileDeletionInitiated, makeFile()),
    );
  });

  it('should create and expose the file name', () => {
    const fixture = TestBed.createComponent(FileDeletionDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    const instance = fixture.componentInstance as unknown as { fileName: () => string };
    expect(instance.fileName()).toBe('report.pdf');
  });

  it('should fire FileDeletionConfirmed with the selected uuid', () => {
    const fixture = TestBed.createComponent(FileDeletionDialog);
    fixture.detectChanges();
    const fireSpy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as { onConfirm: () => void }).onConfirm();

    expect(fireSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApplicationEventType.FileDeletionConfirmed,
        payload: { uuid: 'file-1' },
      }),
    );
  });

  it('should fire FileDeletionCancelled on cancel', () => {
    const fixture = TestBed.createComponent(FileDeletionDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onCancel: () => void }).onCancel();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.FileDeletionCancelled);
  });
});
