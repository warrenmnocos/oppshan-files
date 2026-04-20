export type OperationCommand =
  SignInCommand
  | DirectoryNavigationCommand
  | DirectoryCreateCommand
  | DirectoryRenameCommand
  | DirectoryDeletionCommand;

export interface SignInCommand {
  readonly tenant: string;
}

export interface DirectoryNavigationCommand {
  readonly uuid?: string;
  readonly path?: string;
}

export interface DirectoryCreateCommand {
  readonly name: string;
  readonly parentUuid: string;
}

export interface DirectoryRenameCommand {
  readonly uuid: string;
  readonly name: string;
}

export interface DirectoryDeletionCommand {
  readonly uuid: string;
}
