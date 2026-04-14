import {computed, Injectable, OnDestroy} from '@angular/core';
import {ApplicationEventType} from '../models/application-event-type';
import {filter, Subject} from 'rxjs';
import {toSignal} from '@angular/core/rxjs-interop';
import {ApplicationEvent} from '../models/application-event';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MessageBusService implements OnDestroy {

  constructor(private readonly messageEmitter = new Subject<unknown>(),
              readonly messages = this.messageEmitter.asObservable(),
              readonly applicationEventStream = this.messageEmitter
                .asObservable()
                .pipe(
                  filter((event): event is ApplicationEvent =>
                    event instanceof ApplicationEvent
                  ),
                ),
              readonly applicationEventTypeStream = this.applicationEventStream
                .pipe(
                  map(event => event.type),
                ),
              readonly applicationEventSignal = toSignal(
                this.applicationEventStream,
                {
                  initialValue: new ApplicationEvent(ApplicationEventType.None)
                },
              ),
              readonly applicationEvenTypeSignal = computed(() => this.applicationEventSignal().type),) {
  }

  ngOnDestroy(): void {
    this.messageEmitter.complete();
  }

  fireApplicationEvent(event: ApplicationEvent): void {
    this.messageEmitter.next(event);
  }

  fireApplicationEventOfType(event: ApplicationEventType): void {
    this.messageEmitter.next(new ApplicationEvent(event));
  }
}
