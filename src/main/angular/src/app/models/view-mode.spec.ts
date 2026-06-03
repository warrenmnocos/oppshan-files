import { VIEW_MODE_KEY, ViewMode } from './view-mode';

describe('ViewMode', () => {
  it('should expose list and grid modes with lowercase string values', () => {
    expect(ViewMode.List).toBe('list');
    expect(ViewMode.Grid).toBe('grid');
  });

  it('should contain exactly two members', () => {
    expect(Object.values(ViewMode)).toEqual(['list', 'grid']);
  });

  it('should expose the localStorage persistence key', () => {
    expect(VIEW_MODE_KEY).toBe('oppshan_files_view_mode');
  });
});
