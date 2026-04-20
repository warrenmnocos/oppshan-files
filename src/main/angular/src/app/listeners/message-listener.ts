import {InjectionToken} from '@angular/core';

export interface MessageListener {

  onMessage(message: unknown): void;
}

export const MESSAGE_LISTENERS = new InjectionToken<MessageListener[]>(
  'MESSAGE_LISTENERS'
);
