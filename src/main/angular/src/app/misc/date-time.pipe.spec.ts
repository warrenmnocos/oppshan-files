import { DateTime } from 'luxon';
import { DateTimePipe } from './date-time.pipe';

describe('DateTimePipe', () => {
  const pipe = new DateTimePipe();

  it('should format with the default pattern', () => {
    const value = DateTime.fromISO('2026-01-15T10:30:00');
    expect(pipe.transform(value)).toBe('Jan 15, 2026');
  });

  it('should honour a custom format', () => {
    const value = DateTime.fromISO('2026-01-15T10:30:00');
    expect(pipe.transform(value, 'yyyy-MM-dd')).toBe('2026-01-15');
  });

  it('should return an empty string for null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
