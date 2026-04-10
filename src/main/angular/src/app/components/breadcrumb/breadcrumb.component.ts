import {Component, input, output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {BreadcrumbView} from '../../models/breadcrumb-view';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  imports: [TranslatePipe],
})
export class Breadcrumb {

  readonly loading = input.required<boolean>();

  readonly breadcrumbViews = input<BreadcrumbView[]>();

  readonly navigated = output<string>();

  onNavigate(uuid: string): void {
    this.navigated.emit(uuid);
  }
}
