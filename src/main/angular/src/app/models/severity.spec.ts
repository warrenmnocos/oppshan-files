import { Severity } from './severity';

describe('Severity', () => {
  it('should expose the three severity levels with lowercase string values', () => {
    expect(Severity.Info).toBe('info');
    expect(Severity.Warning).toBe('warning');
    expect(Severity.Error).toBe('error');
  });

  it('should contain exactly three members', () => {
    expect(Object.values(Severity)).toEqual(['info', 'warning', 'error']);
  });
});
