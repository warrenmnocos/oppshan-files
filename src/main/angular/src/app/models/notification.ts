import {MessageCode} from "./message-code";
import {Severity} from "./severity";

export interface Notification {
  readonly id: number;
  readonly messageCode: MessageCode;
  readonly severity: Severity;
}
