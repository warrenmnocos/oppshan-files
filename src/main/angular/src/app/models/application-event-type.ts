export enum ApplicationEventType {
  None = 'done',

  SignInInitiated = 'signInInitiated',
  SignInSucceeded = 'signInSucceeded',
  SignInFailed = 'signInFailed',

  SignOutInitiated = 'signOutInitiated',
  SignOutSucceeded = 'signOutSucceeded',
  SignOutFailed = 'signOutFailed',

  DirectoryCreateInitiated = 'directoryCreateInitiated',
  DirectoryCreateSucceeded = 'directoryCreateSucceeded',
  DirectoryCreateFailed = 'directoryCreateFailed',

  DirectoryRenameInitiated = 'directoryRenameInitiated',
  DirectoryRenameSucceeded = 'directoryRenameSucceeded',
  DirectoryRenameFailed = 'directoryRenameFailed',

  DirectoryDeletionInitiated = 'directoryDeletionInitiated',
  DirectoryDeletionSucceeded = 'directoryDeletionSucceeded',
  DirectoryDeletionFailed = 'directoryDeletionFailed',

  DirectoryPropertiesShown = 'directoryPropertiesShown',
  DirectoryPropertiesHidden = 'directoryPropertiesHidden',

  FileCreateInitiated = 'fileCreateInitiated',
  FileCreateSucceeded = 'fileCreateSucceeded',
  FileCreateFailed = 'fileCreateFailed',

  FileRenameInitiated = 'fileRenameInitiated',
  FileRenameSucceeded = 'fileRenameSucceeded',
  FileRenameFailed = 'fileRenameFailed',

  FileDeletionInitiated = 'fileDeletionInitiated',
  FileDeletionSucceeded = 'fileDeletionSucceeded',
  FileDeletionFailed = 'fileDeletionFailed',

  FilePropertiesShown = 'filePropertiesShown',
  FilePropertiesHidden = 'filePropertiesHidden',
}
