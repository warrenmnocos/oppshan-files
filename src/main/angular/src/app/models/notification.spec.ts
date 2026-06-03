import { ProgressKind } from './notification';

describe('ProgressKind', () => {
  it('should expose upload and download kinds with lowercase string values', () => {
    expect(ProgressKind.Upload).toBe('upload');
    expect(ProgressKind.Download).toBe('download');
  });

  it('should contain exactly two members', () => {
    expect(Object.values(ProgressKind)).toEqual(['upload', 'download']);
  });
});
