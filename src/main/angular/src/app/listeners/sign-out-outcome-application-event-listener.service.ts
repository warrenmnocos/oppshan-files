import {ApplicationEventType} from "../models/application-event-type";
import {AbstractApplicationEventListener} from "./abstract-application-event-listener";
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';

@Injectable()
export class SignOutOutcomeApplicationEventListener extends AbstractApplicationEventListener {

  constructor() {
    super(ApplicationEventType.SignOutSucceeded, ApplicationEventType.SignOutFailed);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    window.location.href = '/sso/sign-in';
  }
}
