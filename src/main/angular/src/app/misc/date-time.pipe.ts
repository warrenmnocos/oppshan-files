import {Pipe, PipeTransform} from '@angular/core';
import {DateTime} from 'luxon';

@Pipe({name: 'dateTime', standalone: true})
export class DateTimePipe implements PipeTransform {

  transform(value: DateTime | null | undefined,
            format: string = 'MMM d, yyyy'): string {
    if (!value) {
      return '';
    }

    return value.toFormat(format);
  }
}
