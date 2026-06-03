import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { RegularFilePropertiesView } from './regular-file-properties-view';

describe('RegularFilePropertiesView', () => {
  it('should hydrate ISO date strings into luxon DateTime via @TransformDateTime', () => {
    const view = plainToInstance(RegularFilePropertiesView, {
      uuid: 'file-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      parentUuid: 'dir-1',
      parentName: 'Documents',
      createdAt: '2026-01-15T10:30:00Z',
      lastModifiedAt: '2026-02-20T08:00:00Z',
    });

    expect(view).toBeInstanceOf(RegularFilePropertiesView);
    expect(view.createdAt).toBeInstanceOf(DateTime);
    expect(view.createdAt.year).toBe(2026);
    expect(view.lastModifiedAt.month).toBe(2);
    expect(view.mimeType).toBe('application/pdf');
    expect(view.parentName).toBe('Documents');
  });

  it('should map a null or absent date to null', () => {
    const view = plainToInstance(RegularFilePropertiesView, { createdAt: null });
    expect(view.createdAt).toBeNull();
  });
});
