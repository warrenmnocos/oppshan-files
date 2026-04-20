import {Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {BreadcrumbView} from '../../models/breadcrumb-view';
import {MessageBusService} from '../../services/message-bus-service';
import {ApplicationEvent} from '../../models/application-event';
import {ApplicationEventType} from '../../models/application-event-type';
import {DirectoryNavigationCommand} from '../../models/operation-commands';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  imports: [TranslatePipe],
})
export class Breadcrumb {

  readonly loading = input.required<boolean>();

  readonly breadcrumbViews = input<BreadcrumbView[]>();

  constructor(private readonly messageBusService: MessageBusService) {
  }

  onNavigate(uuid: string | null): void {
    this.messageBusService.fireApplicationEvent(
      new ApplicationEvent(
        ApplicationEventType.DirectoryNavigationInitiated,
        {
          uuid: uuid,
        } as DirectoryNavigationCommand
      )
    );
  }
}
