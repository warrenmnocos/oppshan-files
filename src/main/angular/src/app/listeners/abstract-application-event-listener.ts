import {ApplicationEventType} from "../models/application-event-type";
import {MessageListener} from "./message-listener";
import {ApplicationEvent} from '../models/application-event';

export abstract class AbstractApplicationEventListener implements MessageListener {

  private readonly applicationEvents: ApplicationEventType[];

  constructor(...applicationEvents: ApplicationEventType[]) {
    this.applicationEvents = applicationEvents;
  }

  onMessage(applicationEvent: unknown): void {
    if (!(applicationEvent instanceof ApplicationEvent)) {
      return;
    }

    if (!this.applicationEvents.includes(applicationEvent.type)) {
      return;
    }

    this.onApplicationEvent(applicationEvent);
  }

  abstract onApplicationEvent(applicationEvent: ApplicationEvent): void;
}

