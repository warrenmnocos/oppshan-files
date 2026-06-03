import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { UserAccountView } from './user-account-view';

describe('UserAccountView', () => {
  it('should hydrate ISO date strings into luxon DateTime via @TransformDateTime', () => {
    const view = plainToInstance(UserAccountView, {
      uuid: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      photoUrl: null,
      usedStorageBytes: 100,
      maxStorageBytes: 1000,
      maxFileUploadBytes: 500,
      rootFileNodeUuid: 'root',
      createdAt: '2026-01-15T10:30:00Z',
      lastModifiedAt: '2026-02-20T08:00:00Z',
    });

    expect(view).toBeInstanceOf(UserAccountView);
    expect(view.createdAt).toBeInstanceOf(DateTime);
    expect(view.createdAt.year).toBe(2026);
    expect(view.lastModifiedAt.month).toBe(2);
    expect(view.email).toBe('ada@example.com');
  });

  it('should map a null or absent date to null', () => {
    const view = plainToInstance(UserAccountView, { createdAt: null });
    expect(view.createdAt).toBeNull();
  });
});
