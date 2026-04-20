import {ApplicationEventType} from './application-event-type';

export class ApplicationEvent {

  constructor(readonly type: ApplicationEventType,
              readonly payload: unknown = null,) {
  }
}
