import {MessageCode} from './message-code';
import {DirectoryContentsView} from './directory-contents-view';

export type OperationOutcome =
  SignInSucceeded
  | DirectoryNavigationSucceeded
  | DirectoryNavigationFailed
  | DirectoryCreateSucceeded
  | DirectoryCreateFailed
  | DirectoryRenameSucceeded
  | DirectoryRenameFailed
  | DirectoryDeletionSucceeded
  | DirectoryDeletionFailed
  | FileCreateSucceeded
  | FileCreateFailed
  | FileRenameSucceeded
  | FileRenameFailed
  | FileDeletionSucceeded
  | FileDeletionFailed;

export interface SignInSucceeded {
  readonly messageCode: MessageCode;
  readonly tenant: string;
}

export interface DirectoryContentsViewAwareDirectoryOperationResult {
  readonly directoryContentsView: DirectoryContentsView;
}

export interface DirectoryNavigationSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid?: string;
  readonly path?: string;
}

export interface DirectoryNavigationFailed {
  readonly messageCode: MessageCode;
  readonly uuid?: string;
  readonly path?: string;
}

export interface DirectoryCreateSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid: string;
  readonly name: string;
  readonly directoryContentsView: DirectoryContentsView;
}

export interface DirectoryCreateFailed {
  readonly messageCode: MessageCode;
}

export interface DirectoryRenameSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid: string;
  readonly name: string;
}

export interface DirectoryRenameFailed {
  readonly messageCode: MessageCode;
}

export interface DirectoryDeletionSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid: string;
}

export interface DirectoryDeletionFailed {
  readonly messageCode: MessageCode;
}

export interface FileCreateSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
}

export interface FileCreateFailed {
  readonly messageCode: MessageCode;
}

export interface FileRenameSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid: string;
}

export interface FileRenameFailed {
  readonly messageCode: MessageCode;
}

export interface FileDeletionSucceeded extends DirectoryContentsViewAwareDirectoryOperationResult {
  readonly messageCode: MessageCode;
  readonly uuid: string;
}

export interface FileDeletionFailed {
  readonly messageCode: MessageCode;
}

export interface FileUploadInitiated {
  readonly id: string;
  readonly label: string;
  readonly params?: Record<string, unknown>;
}

export interface FileUploadProgressUpdated {
  readonly id: string;
  readonly progress: number;
}

export interface FileUploadSucceeded {
  readonly id: string;
  readonly directoryContentsView: DirectoryContentsView;
}

export interface FileUploadFailed {
  readonly id: string;
  readonly messageCode: MessageCode;
}
