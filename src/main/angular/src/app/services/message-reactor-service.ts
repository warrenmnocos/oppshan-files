import {Inject, Injectable, OnDestroy} from '@angular/core';
import {MESSAGE_LISTENERS, MessageListener} from '../listeners/message-listener';
import {MessageBusService} from './message-bus-service';
import {Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MessageReactorService implements OnDestroy {

  private messagesSubscription?: Subscription;

  constructor(private readonly messageBusService: MessageBusService,
              @Inject(MESSAGE_LISTENERS) private readonly messageListeners: MessageListener[]) {
  }

  start(): void {
    if (this.messagesSubscription) {
      return;
    }

    this.messagesSubscription = this.messageBusService.messages.subscribe(message => {
      this.messageListeners.forEach(listener => listener.onMessage(message));
    })
  }

  stop(): void {
    this.messagesSubscription?.unsubscribe();
    this.messagesSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
