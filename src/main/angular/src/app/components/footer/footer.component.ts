import {Component, Signal, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [TranslatePipe],
})
export class Footer {

  protected readonly currentYear: Signal<number>;

  protected readonly sourceUrl: string;

  constructor() {
    this.currentYear = signal(new Date().getFullYear());
    this.sourceUrl = 'https://github.com/warrenmnocos/oppshan-files';
  }
}
