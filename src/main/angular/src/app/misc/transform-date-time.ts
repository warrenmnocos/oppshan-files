import {Transform} from 'class-transformer';
import {DateTime} from 'luxon';

export function TransformDateTime(): PropertyDecorator {

  return Transform(({value}) => {
    if (value instanceof DateTime) {
      return value;
    }

    return (typeof value === 'string') ? DateTime.fromISO(value) : null;
  });
}
