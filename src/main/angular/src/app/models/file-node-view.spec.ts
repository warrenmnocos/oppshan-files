import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { FileNodeView } from './file-node-view';

describe('FileNodeView', () => {
  it('should hydrate ISO date strings into luxon DateTime via @TransformDateTime', () => {
    const view = plainToInstance(FileNodeView, {
      uuid: 'file-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      directory: false,
      sizeBytes: 2048,
      parentUuid: 'dir-1',
      createdAt: '2026-01-15T10:30:00Z',
      lastModifiedAt: '2026-02-20T08:00:00Z',
    });

    expect(view).toBeInstanceOf(FileNodeView);
    expect(view.createdAt).toBeInstanceOf(DateTime);
    expect(view.createdAt.year).toBe(2026);
    expect(view.lastModifiedAt.month).toBe(2);
    expect(view.directory).toBe(false);
    expect(view.parentUuid).toBe('dir-1');
  });

  it('should map a null or absent date to null', () => {
    const view = plainToInstance(FileNodeView, { createdAt: null });
    expect(view.createdAt).toBeNull();
  });
});
