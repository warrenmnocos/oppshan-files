export enum ContextMenuItemId {
  Open = 'Open',
  Download = 'Download',
  Rename = 'Rename',
  Properties = 'Properties',
  Delete = 'Delete',
  NewFolder = 'NewFolder',
  UploadFile = 'UploadFile',
  Refresh = 'Refresh',
  Divider = 'Divider',
}

export interface ContextMenuItem {
  id: ContextMenuItemId;
  labelKey?: string;
  iconSrc?: string;
  danger?: boolean;
}
