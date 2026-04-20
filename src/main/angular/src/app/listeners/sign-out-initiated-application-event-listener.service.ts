import {ApplicationEventType} from "../models/application-event-type";
import {AbstractApplicationEventListener} from "./abstract-application-event-listener";
import {Injectable} from '@angular/core';
import {ApplicationEvent} from '../models/application-event';
import {AuthService} from '../services/auth-service.service';

@Injectable()
export class SignOutInitiatedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly authService: AuthService) {
    super(ApplicationEventType.SignOutInitiated);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    this.authService.signOut();
  }
}
