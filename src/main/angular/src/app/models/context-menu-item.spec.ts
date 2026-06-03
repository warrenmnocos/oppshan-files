import { ContextMenuItemId } from './context-menu-item';

describe('ContextMenuItemId', () => {
  it('should map each item id to its PascalCase string value', () => {
    expect(ContextMenuItemId.Open).toBe('Open');
    expect(ContextMenuItemId.Download).toBe('Download');
    expect(ContextMenuItemId.Rename).toBe('Rename');
    expect(ContextMenuItemId.Properties).toBe('Properties');
    expect(ContextMenuItemId.Delete).toBe('Delete');
    expect(ContextMenuItemId.NewFolder).toBe('NewFolder');
    expect(ContextMenuItemId.UploadFile).toBe('UploadFile');
    expect(ContextMenuItemId.Refresh).toBe('Refresh');
    expect(ContextMenuItemId.Divider).toBe('Divider');
  });

  it('should contain exactly the nine known menu item ids', () => {
    expect(Object.values(ContextMenuItemId)).toEqual([
      'Open',
      'Download',
      'Rename',
      'Properties',
      'Delete',
      'NewFolder',
      'UploadFile',
      'Refresh',
      'Divider',
    ]);
  });
});
