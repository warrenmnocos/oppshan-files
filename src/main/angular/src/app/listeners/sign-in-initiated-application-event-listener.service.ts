import {AbstractApplicationEventListener} from './abstract-application-event-listener';
import {ApplicationEventType} from '../models/application-event-type';
import {ApplicationEvent} from '../models/application-event';
import {Injectable} from '@angular/core';
import {SignInCommand} from '../models/operation-commands';
import {AuthService} from '../services/auth-service.service';

@Injectable()
export class SignInInitiatedApplicationEventListener extends AbstractApplicationEventListener {

  constructor(private readonly authService: AuthService,) {
    super(ApplicationEventType.SignInInitiated);
  }

  onApplicationEvent(applicationEvent: ApplicationEvent): void {
    this.authService.signIn((applicationEvent.payload as SignInCommand)?.tenant);
  }
}

