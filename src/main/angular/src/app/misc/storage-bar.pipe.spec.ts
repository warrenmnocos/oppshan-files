import { StorageBarPipe } from './storage-bar.pipe';
import { FileService } from '../services/file-service.service';
import { UserAccountView } from '../models/user-account-view';

describe('StorageBarPipe', () => {
  function pipeWith(
    getFileSizeDisplay: (bytes: number | null | undefined) => string,
  ): StorageBarPipe {
    return new StorageBarPipe({ getFileSizeDisplay } as unknown as FileService);
  }

  it('should format used and max storage separated by a slash', () => {
    const display = vi.fn((bytes: number | null | undefined) => `${bytes}`);
    const pipe = pipeWith(display);
    const view = { usedStorageBytes: 1024, maxStorageBytes: 4096 } as UserAccountView;

    expect(pipe.transform(view)).toBe('1024 / 4096');
    expect(display).toHaveBeenCalledWith(1024);
    expect(display).toHaveBeenCalledWith(4096);
  });

  it('should return an empty string for null input', () => {
    const display = vi.fn();
    const pipe = pipeWith(display);

    expect(pipe.transform(null)).toBe('');
    expect(display).not.toHaveBeenCalled();
  });

  it('should return an empty string for undefined input', () => {
    const display = vi.fn();
    const pipe = pipeWith(display);

    expect(pipe.transform(undefined)).toBe('');
    expect(display).not.toHaveBeenCalled();
  });
});
