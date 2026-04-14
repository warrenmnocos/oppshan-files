import {Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageCode} from '../../models/message-code';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  imports: [TranslatePipe],
})
export class ErrorState {

  readonly messageCode = input.required<MessageCode>();
}
