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
  | DirectoryDeletionFailed;

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
