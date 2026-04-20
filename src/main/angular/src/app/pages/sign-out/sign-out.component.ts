import {Component, OnInit} from '@angular/core';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEventType} from '../../models/application-event-type';

@Component({
  selector: 'app-sign-out',
  template: '',
})
export class SignOut implements OnInit {

  constructor(private readonly messageBusService: MessageBusService,) {
  }

  ngOnInit(): void {
    this.messageBusService.fireApplicationEventOfType(ApplicationEventType.SignOutInitiated);
  }
}
