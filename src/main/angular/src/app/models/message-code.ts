export enum MessageCode {
  AuthenticationRequired = 'messages.errors.authenticationRequired',
  StorageCapacityExceeded = 'messages.errors.storageCapacityExceeded',
  UserNotFound = 'messages.errors.userNotFound',
  SignInFailed = 'messages.errors.signInFailed',
  DirectoryNotFound = 'messages.errors.directoryNotFound',
  DirectoryNameNotUnique = 'messages.errors.directoryNameNotUnique',
  DirectoryNameRequired = 'messages.errors.directoryNameRequired',
  RootDirectoryDeletionNotAllowed = 'messages.errors.rootDirectoryDeletionNotAllowed',
  AccessDenied = 'messages.errors.accessDenied',

  SignInSucceeded = 'messages.info.signInSucceeded',
  DirectoryNavigated = 'messages.info.directoryNavigated',
  DirectoryCreated = 'messages.info.directoryCreated',
  DirectoryRenamed = 'messages.info.directoryRenamed',
  DirectoryDeleted = 'messages.info.directoryDeleted',

  Unknown = 'messages.errors.unknown',
}
