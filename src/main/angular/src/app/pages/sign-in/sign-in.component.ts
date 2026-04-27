import {Component, OnInit, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageCode} from '../../models/message-code';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {SignInCommand} from '../../models/operation-commands';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  imports: [TranslatePipe],
})
export class SignIn implements OnInit {

  protected readonly errorKey: WritableSignal<MessageCode | null>;

  constructor(private readonly messageBusService: MessageBusService,
              private readonly route: ActivatedRoute) {
    this.errorKey = signal<MessageCode | null>(null);
  }

  ngOnInit(): void {
    const message = this.route.snapshot.queryParamMap.get('message');
    if (message) {
      this.errorKey.set(Object.values(MessageCode).find(code => code === message) ?? MessageCode.Unknown);
    }
  }

  signIn(): void {
    const command: SignInCommand = {
      tenant: this.route.snapshot.queryParamMap.get('tenant') ?? 'google'
    }
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.SignInInitiated,
      command
    ));
  }
}
