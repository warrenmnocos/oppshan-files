import {MessageCode} from './message-code';
import {Severity} from './severity';

export interface ApplicationNotification {
  readonly type: string;
  readonly id: string;
}

export interface MessageNotification extends ApplicationNotification {
  readonly type: 'message';
  readonly messageCode: MessageCode;
  readonly severity: Severity;
  readonly params?: Record<string, unknown>;
}

export enum ProgressKind {
  Upload = 'upload',
  Download = 'download',
}

export interface ProgressNotification extends ApplicationNotification {
  readonly type: 'progress';
  readonly kind: ProgressKind;
  readonly label: string;
  readonly params?: Record<string, unknown>;
  readonly progress: number;
}
