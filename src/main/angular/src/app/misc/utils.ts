import {HttpErrorResponse} from '@angular/common/http';
import {MessageCode} from '../models/message-code';
import {Severity} from '../models/severity';

export const NotificationDurationMs = 4000;

export function resolveMessageCode(error: HttpErrorResponse): MessageCode {
  const messageCode = error.error?.messageCode;
  return Object.values(MessageCode).find(code => code === messageCode) ?? MessageCode.Unknown;
}

export function resolveSeverity(messageCode: MessageCode): Severity {
  if (messageCode.startsWith('messages.info.')) {
    return Severity.Info;
  }

  if (messageCode.startsWith('messages.warning.')) {
    return Severity.Warning;
  }

  return Severity.Error;
}
