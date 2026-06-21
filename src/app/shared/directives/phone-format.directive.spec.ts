import { formatUsPhone } from './phone-format.directive';

describe('formatUsPhone', () => {
  it('returns empty string for nullish/empty input', () => {
    expect(formatUsPhone('')).toBe('');
    expect(formatUsPhone(null)).toBe('');
    expect(formatUsPhone(undefined)).toBe('');
  });

  it('formats a full 10-digit number as (xxx) xxx xxxx', () => {
    expect(formatUsPhone('5550000000')).toBe('(555) 000 0000');
  });

  it('strips a leading +1 / 1 country code', () => {
    expect(formatUsPhone('+15550000000')).toBe('(555) 000 0000');
    expect(formatUsPhone('15550000000')).toBe('(555) 000 0000');
  });

  it('strips existing separators and re-formats', () => {
    expect(formatUsPhone('(555) 000-0000')).toBe('(555) 000 0000');
    expect(formatUsPhone('555.000.0000')).toBe('(555) 000 0000');
  });

  it('formats progressively while typing', () => {
    expect(formatUsPhone('5')).toBe('(5');
    expect(formatUsPhone('555')).toBe('(555');
    expect(formatUsPhone('555000')).toBe('(555) 000');
    expect(formatUsPhone('5550000')).toBe('(555) 000 0');
  });

  it('caps at 10 significant digits', () => {
    expect(formatUsPhone('55500000009999')).toBe('(555) 000 0000');
  });

  it('is idempotent', () => {
    const once = formatUsPhone('5550000000');
    expect(formatUsPhone(once)).toBe(once);
  });
});
