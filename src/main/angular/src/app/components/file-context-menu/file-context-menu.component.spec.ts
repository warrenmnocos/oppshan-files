import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FileContextMenu } from './file-context-menu.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { ContextMenuItem, ContextMenuItemId } from '../../models/context-menu-item';
import { FileNodeView } from '../../models/file-node-view';
import { ContextMenuShown } from '../../models/operation-outcomes';

type Internals = {
  select: (item: ContextMenuItem) => void;
};

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

function resolveItems(
  instance: FileContextMenu,
  target: FileNodeView | null,
  quotaExceeded: boolean,
): readonly ContextMenuItem[] {
  return (
    instance as unknown as {
      resolveItems: (t: FileNodeView | null, q: boolean) => readonly ContextMenuItem[];
    }
  ).resolveItems(target, quotaExceeded);
}

function showMenu(bus: MessageBusService, payload: ContextMenuShown): void {
  bus.fireApplicationEvent(new ApplicationEvent(ApplicationEventType.ContextMenuShown, payload));
}

describe('FileContextMenu', () => {
  beforeEach(() => {
    // jsdom does not implement matchMedia; the constructor reads it.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    TestBed.configureTestingModule({
      imports: [FileContextMenu],
      providers: [provideTranslateService({ lang: 'en' })],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FileContextMenu);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should build the empty-area menu (refresh / new folder / upload) when target is null', () => {
    const fixture = TestBed.createComponent(FileContextMenu);
    const ids = resolveItems(fixture.componentInstance, null, false).map((i) => i.id);
    expect(ids).toContain(ContextMenuItemId.Refresh);
    expect(ids).toContain(ContextMenuItemId.NewFolder);
    expect(ids).toContain(ContextMenuItemId.UploadFile);
  });

  it('should disable new-folder and upload when quota is exceeded', () => {
    const fixture = TestBed.createComponent(FileContextMenu);
    const items = resolveItems(fixture.componentInstance, null, true);
    const newFolder = items.find((i) => i.id === ContextMenuItemId.NewFolder);
    const upload = items.find((i) => i.id === ContextMenuItemId.UploadFile);
    expect(newFolder?.disabled).toBe(true);
    expect(upload?.disabled).toBe(true);
  });

  it('should build the directory menu (open / rename / properties / delete) for a directory target', () => {
    const fixture = TestBed.createComponent(FileContextMenu);
    const ids = resolveItems(fixture.componentInstance, fileNode({ directory: true }), false).map(
      (i) => i.id,
    );
    expect(ids).toContain(ContextMenuItemId.Open);
    expect(ids).not.toContain(ContextMenuItemId.Download);
  });

  it('should build the file menu (download instead of open) for a regular-file target', () => {
    const fixture = TestBed.createComponent(FileContextMenu);
    const ids = resolveItems(fixture.componentInstance, fileNode({ directory: false }), false).map(
      (i) => i.id,
    );
    expect(ids).toContain(ContextMenuItemId.Download);
    expect(ids).not.toContain(ContextMenuItemId.Open);
  });

  it('should fire DirectoryNavigationInitiated when Open is selected', () => {
    const bus = TestBed.inject(MessageBusService);
    const target = fileNode({ directory: true, uuid: 'dir-9' });
    showMenu(bus, { target, position: { x: 0, y: 0 }, parentUuid: 'root', quotaExceeded: false });

    const fixture = TestBed.createComponent(FileContextMenu);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as Internals).select({
      id: ContextMenuItemId.Open,
    });

    const event = spy.mock.calls.at(-1)?.[0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationInitiated);
    expect((event.payload as { uuid: string }).uuid).toBe('dir-9');
  });

  it('should fire FileDownloadConfirmed when Download is selected on a file target', () => {
    const bus = TestBed.inject(MessageBusService);
    const target = fileNode({ directory: false, uuid: 'f-7', name: 'doc.pdf' });
    showMenu(bus, { target, position: { x: 0, y: 0 }, parentUuid: 'root', quotaExceeded: false });

    const fixture = TestBed.createComponent(FileContextMenu);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as Internals).select({
      id: ContextMenuItemId.Download,
    });

    const event = spy.mock.calls.at(-1)?.[0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.FileDownloadConfirmed);
    expect(event.payload as { uuid: string; name: string }).toEqual({
      uuid: 'f-7',
      name: 'doc.pdf',
    });
  });

  it('should ignore divider selections', () => {
    const bus = TestBed.inject(MessageBusService);
    showMenu(bus, {
      target: null,
      position: { x: 0, y: 0 },
      parentUuid: 'root',
      quotaExceeded: false,
    });

    const fixture = TestBed.createComponent(FileContextMenu);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as Internals).select({ id: ContextMenuItemId.Divider });

    expect(spy).not.toHaveBeenCalled();
  });
});
