import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { BreadcrumbView } from './breadcrumb-view';
import { DirectoryContentsView } from './directory-contents-view';
import { FileNodeView } from './file-node-view';

describe('DirectoryContentsView', () => {
  it('should hydrate nested breadcrumb and child file-node arrays into their classes', () => {
    const view = plainToInstance(DirectoryContentsView, {
      uuid: 'dir-1',
      name: 'Documents',
      parentUuid: 'root',
      targetFileUuid: null,
      breadcrumbViews: [
        { uuid: 'root', name: 'Home', directory: true },
        { uuid: 'dir-1', name: 'Documents', directory: true },
      ],
      childrenFileNodeViews: [
        {
          uuid: 'file-1',
          name: 'report.pdf',
          mimeType: 'application/pdf',
          directory: false,
          sizeBytes: 2048,
          parentUuid: 'dir-1',
          createdAt: '2026-01-15T10:30:00Z',
          lastModifiedAt: '2026-02-20T08:00:00Z',
        },
      ],
    });

    expect(view).toBeInstanceOf(DirectoryContentsView);
    expect(view.breadcrumbViews).toHaveLength(2);
    expect(view.breadcrumbViews[0]).toBeInstanceOf(BreadcrumbView);
    expect(view.breadcrumbViews[1].name).toBe('Documents');

    expect(view.childrenFileNodeViews).toHaveLength(1);
    expect(view.childrenFileNodeViews[0]).toBeInstanceOf(FileNodeView);
  });

  it('should hydrate the @TransformDateTime fields of nested children into luxon DateTime', () => {
    const view = plainToInstance(DirectoryContentsView, {
      uuid: 'dir-1',
      name: 'Documents',
      parentUuid: 'root',
      targetFileUuid: null,
      breadcrumbViews: [],
      childrenFileNodeViews: [
        {
          uuid: 'file-1',
          name: 'report.pdf',
          createdAt: '2026-01-15T10:30:00Z',
          lastModifiedAt: '2026-02-20T08:00:00Z',
        },
      ],
    });

    const child = view.childrenFileNodeViews[0];
    expect(child.createdAt).toBeInstanceOf(DateTime);
    expect(child.createdAt.year).toBe(2026);
    expect(child.lastModifiedAt.month).toBe(2);
  });

  it('should leave empty nested arrays empty', () => {
    const view = plainToInstance(DirectoryContentsView, {
      uuid: 'dir-1',
      name: 'Documents',
      parentUuid: null,
      targetFileUuid: null,
      breadcrumbViews: [],
      childrenFileNodeViews: [],
    });

    expect(view.breadcrumbViews).toEqual([]);
    expect(view.childrenFileNodeViews).toEqual([]);
    expect(view.parentUuid).toBeNull();
  });
});
