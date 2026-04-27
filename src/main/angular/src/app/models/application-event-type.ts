export enum ApplicationEventType {
  None = 'none',

  SignInInitiated = 'signInInitiated',
  SignInSucceeded = 'signInSucceeded',
  SignInFailed = 'signInFailed',

  SignOutInitiated = 'signOutInitiated',
  SignOutSucceeded = 'signOutSucceeded',
  SignOutFailed = 'signOutFailed',

  DirectoryCreateInitiated = 'directoryCreateInitiated',
  DirectoryCreateSucceeded = 'directoryCreateSucceeded',
  DirectoryCreateFailed = 'directoryCreateFailed',
  DirectoryCreateConfirmed = 'directoryCreateConfirmed',
  DirectoryCreateCancelled = 'directoryCreateCancelled',

  DirectoryRenameInitiated = 'directoryRenameInitiated',
  DirectoryRenameSucceeded = 'directoryRenameSucceeded',
  DirectoryRenameFailed = 'directoryRenameFailed',
  DirectoryRenameConfirmed = 'directoryRenameConfirmed',
  DirectoryRenameCancelled = 'directoryRenameCancelled',

  DirectoryDeletionInitiated = 'directoryDeletionInitiated',
  DirectoryDeletionSucceeded = 'directoryDeletionSucceeded',
  DirectoryDeletionFailed = 'directoryDeletionFailed',
  DirectoryDeletionConfirmed = 'directoryDeletionConfirmed',
  DirectoryDeletionCancelled = 'directoryDeletionCancelled',

  DirectoryNavigationInitiated = 'directoryNavigationInitiated',
  DirectoryNavigationSucceeded = 'directoryNavigationSucceeded',
  DirectoryNavigationFailed = 'directoryNavigationFailed',
  DirectoryNavigationConfirmed = 'directoryNavigationConfirmed',
  DirectoryNavigationCancelled = 'directoryNavigationCancelled',

  DirectoryPropertiesShown = 'directoryPropertiesShown',
  DirectoryPropertiesHidden = 'directoryPropertiesHidden',

  FileCreateInitiated = 'fileCreateInitiated',
  FileCreateSucceeded = 'fileCreateSucceeded',
  FileCreateFailed = 'fileCreateFailed',
  FileCreateConfirmed = 'fileCreateConfirmed',
  FileCreateCancelled = 'fileCreateCancelled',

  FileRenameInitiated = 'fileRenameInitiated',
  FileRenameSucceeded = 'fileRenameSucceeded',
  FileRenameFailed = 'fileRenameFailed',
  FileRenameConfirmed = 'fileRenameConfirmed',
  FileRenameCancelled = 'fileRenameCancelled',

  FileDeletionInitiated = 'fileDeletionInitiated',
  FileDeletionSucceeded = 'fileDeletionSucceeded',
  FileDeletionFailed = 'fileDeletionFailed',
  FileDeletionConfirmed = 'fileDeletionConfirmed',
  FileDeletionCancelled = 'fileDeletionCancelled',

  FilePropertiesShown = 'filePropertiesShown',
  FilePropertiesHidden = 'filePropertiesHidden',

  FileUploadInitiated = 'fileUploadInitiated',
  FileUploadProgressUpdated = 'fileUploadProgressUpdated',
  FileUploadSucceeded = 'fileUploadSucceeded',
  FileUploadFailed = 'fileUploadFailed',
}
