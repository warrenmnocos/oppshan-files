import { plainToInstance } from 'class-transformer';
import { DateTime } from 'luxon';
import { TransformDateTime } from './transform-date-time';

class Holder {
  @TransformDateTime()
  when!: DateTime | null;
}

describe('TransformDateTime', () => {
  it('should parse an ISO string into a luxon DateTime', () => {
    const instance = plainToInstance(Holder, { when: '2026-01-15T10:30:00' });

    expect(instance.when).toBeInstanceOf(DateTime);
    expect(instance.when?.toISODate()).toBe('2026-01-15');
  });

  // The `value instanceof DateTime` guard in the decorator is defensive for
  // re-transform scenarios; plainToInstance is never fed a live DateTime in
  // production (sources are plain JSON strings), and doing so crashes inside
  // class-transformer's deep-clone of luxon, not in our code. Not tested.

  it('should map a non-string value to null', () => {
    const instance = plainToInstance(Holder, { when: 12345 });

    expect(instance.when).toBeNull();
  });

  it('should map null to null', () => {
    const instance = plainToInstance(Holder, { when: null });

    expect(instance.when).toBeNull();
  });
});
