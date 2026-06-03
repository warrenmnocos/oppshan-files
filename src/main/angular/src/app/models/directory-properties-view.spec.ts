import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { DirectoryPropertiesView } from './directory-properties-view';

describe('DirectoryPropertiesView', () => {
  it('should hydrate ISO date strings into luxon DateTime via @TransformDateTime', () => {
    const view = plainToInstance(DirectoryPropertiesView, {
      uuid: 'dir-1',
      name: 'Documents',
      createdAt: '2026-01-15T10:30:00Z',
      lastModifiedAt: '2026-02-20T08:00:00Z',
      directoryCount: 3,
      fileCount: 7,
      totalSizeBytes: 4096,
    });

    expect(view).toBeInstanceOf(DirectoryPropertiesView);
    expect(view.createdAt).toBeInstanceOf(DateTime);
    expect(view.createdAt.year).toBe(2026);
    expect(view.lastModifiedAt.month).toBe(2);
    expect(view.directoryCount).toBe(3);
    expect(view.fileCount).toBe(7);
    expect(view.totalSizeBytes).toBe(4096);
  });

  it('should map a null or absent date to null', () => {
    const view = plainToInstance(DirectoryPropertiesView, { createdAt: null });
    expect(view.createdAt).toBeNull();
  });
});
