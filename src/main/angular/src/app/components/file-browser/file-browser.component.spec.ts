import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FileBrowser } from './file-browser.component';
import { UserAccountView } from '../../models/user-account-view';
import { FileNodeView } from '../../models/file-node-view';
import { ViewMode } from '../../models/view-mode';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { MessageCode } from '../../models/message-code';

type Internals = {
  getIcon: (view: FileNodeView) => string;
  isSelected: (view: FileNodeView) => boolean;
  onFilesSelected: (files: File[] | null) => void;
};

function buildUser(overrides: Partial<UserAccountView>): UserAccountView {
  return Object.assign(
    new UserAccountView(),
    {
      uuid: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      photoUrl: null,
      usedStorageBytes: 0,
      maxStorageBytes: 1000,
      maxFileUploadBytes: 100,
      rootFileNodeUuid: 'root',
    },
    overrides,
  );
}

function fileNode(overrides: Partial<FileNodeView>): FileNodeView {
  return Object.assign(
    new FileNodeView(),
    {
      uuid: 'n1',
      name: 'file.txt',
      mimeType: 'text/plain',
      directory: false,
      sizeBytes: 10,
      parentUuid: 'root',
    },
    overrides,
  );
}

describe('FileBrowser', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileBrowser],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('userAccountView', buildUser({}));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default to list view mode', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);
    expect(fixture.componentInstance.viewMode()).toBe(ViewMode.List);
  });

  it('should report quota exceeded when used meets or exceeds max', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);

    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ usedStorageBytes: 1000, maxStorageBytes: 1000 }),
    );
    expect(fixture.componentInstance.quotaExceeded()).toBe(true);

    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ usedStorageBytes: 10, maxStorageBytes: 1000 }),
    );
    expect(fixture.componentInstance.quotaExceeded()).toBe(false);
  });

  it('should resolve the directory icon for folders', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);
    const instance = fixture.componentInstance as unknown as Internals;
    expect(instance.getIcon(fileNode({ directory: true }))).toBe('/icons/directory.svg');
  });

  it('should track selection through isSelected', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);
    const selected = fileNode({ uuid: 'sel-1' });
    fixture.componentInstance.selectedItems.set([selected]);
    const instance = fixture.componentInstance as unknown as Internals;
    expect(instance.isSelected(selected)).toBe(true);
    expect(instance.isSelected(fileNode({ uuid: 'other' }))).toBe(false);
  });

  it('should reject an oversized file with FileSizeExceeded and not fire a create command', () => {
    const fixture = TestBed.createComponent(FileBrowser);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ maxFileUploadBytes: 5, maxStorageBytes: 1000 }),
    );
    fixture.componentRef.setInput('parentDirectoryUuid', 'parent-1');

    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    const tooBig = new File([new Uint8Array(50)], 'big.bin');
    (fixture.componentInstance as unknown as Internals).onFilesSelected([tooBig]);

    const events = spy.mock.calls.map((call) => call[0] as ApplicationEvent);
    const failure = events.find((event) => event.type === ApplicationEventType.FileCreateFailed);
    expect(failure).toBeDefined();
    expect((failure!.payload as { messageCode: MessageCode }).messageCode).toBe(
      MessageCode.FileSizeExceeded,
    );
    expect(events.some((event) => event.type === ApplicationEventType.FileCreateConfirmed)).toBe(
      false,
    );
  });
});
