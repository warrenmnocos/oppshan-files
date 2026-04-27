export type OperationCommand =
  SignInCommand
  | DirectoryNavigationCommand
  | DirectoryCreateCommand
  | DirectoryRenameCommand
  | DirectoryDeletionCommand
  | FileCreateCommand
  | FileRenameCommand
  | FileDeletionCommand;

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

export interface FileCreateCommand {
  readonly files: File[];
  readonly parentUuid: string;
}

export interface FileRenameCommand {
  readonly uuid: string;
  readonly name: string;
}

export interface FileDeletionCommand {
  readonly uuid: string;
}
