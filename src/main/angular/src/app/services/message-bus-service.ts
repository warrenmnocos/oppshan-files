import {computed, Injectable, OnDestroy, Signal} from '@angular/core';
import {ApplicationEventType} from '../models/application-event-type';
import {filter, Observable, Subject} from 'rxjs';
import {toSignal} from '@angular/core/rxjs-interop';
import {ApplicationEvent} from '../models/application-event';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MessageBusService implements OnDestroy {

  private readonly messageSubject: Subject<unknown>;

  readonly messages: Observable<unknown>;

  readonly applicationEventStream: Observable<ApplicationEvent>;

  readonly applicationEventTypeStream: Observable<ApplicationEventType>;

  readonly applicationEventSignal: Signal<ApplicationEvent>;

  readonly applicationEvenTypeSignal: Signal<ApplicationEventType>;

  constructor() {
    this.messageSubject = new Subject<unknown>();
    this.messages = this.messageSubject.asObservable();
    this.applicationEventStream = this.messageSubject
      .asObservable()
      .pipe(
        filter((event): event is ApplicationEvent =>
          event instanceof ApplicationEvent
        ),
      );
    this.applicationEventTypeStream = this.applicationEventStream
      .pipe(
        map(event => event.type),
      );
    this.applicationEventSignal = toSignal(
      this.applicationEventStream,
      {
        initialValue: new ApplicationEvent(ApplicationEventType.None)
      },
    );
    this.applicationEvenTypeSignal = computed(() => this.applicationEventSignal().type);
  }

  ngOnDestroy(): void {
    this.messageSubject.complete();
  }

  fireApplicationEvent(event: ApplicationEvent): void {
    this.messageSubject.next(event);
  }

  fireApplicationEventOfType(event: ApplicationEventType): void {
    this.messageSubject.next(new ApplicationEvent(event));
  }
}
