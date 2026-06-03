import { FileSizePipe } from './file-size.pipe';
import { FileService } from '../services/file-service.service';

describe('FileSizePipe', () => {
  it('should delegate to FileService.getFileSizeDisplay', () => {
    const getFileSizeDisplay = vi.fn().mockReturnValue('1.5 KB');
    const pipe = new FileSizePipe({ getFileSizeDisplay } as unknown as FileService);

    expect(pipe.transform(1536)).toBe('1.5 KB');
    expect(getFileSizeDisplay).toHaveBeenCalledWith(1536);
  });

  it('should pass null through to the service', () => {
    const getFileSizeDisplay = vi.fn().mockReturnValue('0 B');
    const pipe = new FileSizePipe({ getFileSizeDisplay } as unknown as FileService);

    expect(pipe.transform(null)).toBe('0 B');
    expect(getFileSizeDisplay).toHaveBeenCalledWith(null);
  });

  it('should pass undefined through to the service', () => {
    const getFileSizeDisplay = vi.fn().mockReturnValue('0 B');
    const pipe = new FileSizePipe({ getFileSizeDisplay } as unknown as FileService);

    expect(pipe.transform(undefined)).toBe('0 B');
    expect(getFileSizeDisplay).toHaveBeenCalledWith(undefined);
  });
});
