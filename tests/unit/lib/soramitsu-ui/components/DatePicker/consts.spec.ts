import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('DatePicker consts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports calendar labels and half-hour time points', async () => {
    const { daysNames, months, monthsShort, TIME_POINTS } = await import(
      '@/lib/soramitsu-ui/components/DatePicker/consts'
    );

    expect(months).toHaveLength(12);
    expect(months[0]).toBe('January');
    expect(months.at(-1)).toBe('December');
    expect(monthsShort).toEqual(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AuG', 'SEP', 'OCT', 'NOV', 'DEC']);
    expect(daysNames).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    expect(TIME_POINTS).toHaveLength(48);
    expect(TIME_POINTS.slice(0, 4)).toEqual(['00:00', '00:30', '01:00', '01:30']);
    expect(TIME_POINTS.at(-1)).toBe('23:30');
  });

  it('exports custom option metadata and default shortcut groups', async () => {
    const { CUSTOM_OPTION, CUSTOM_OPTION_VALUE, DEFAULT_SHORTCUTS } = await import(
      '@/lib/soramitsu-ui/components/DatePicker/consts'
    );

    expect(CUSTOM_OPTION).toEqual({
      label: 'Custom',
      value: CUSTOM_OPTION_VALUE,
    });
    expect(DEFAULT_SHORTCUTS.day.map((option) => option.label)).toEqual([
      'Any time',
      'Today',
      'Yesterday',
      'Tomorrow',
      'Next week',
      'Next month',
    ]);
    expect(DEFAULT_SHORTCUTS.range.map((option) => option.label)).toEqual([
      'All time',
      'This week',
      'Last week',
      'Next week',
      'This month',
      'Last month',
      'Next month',
      'This year',
    ]);
    expect(DEFAULT_SHORTCUTS.day[0].value).toBeNull();
    expect(DEFAULT_SHORTCUTS.day[1].value).toBeInstanceOf(Date);
    expect(DEFAULT_SHORTCUTS.range[1].value).toEqual([expect.any(Date), expect.any(Date)]);
  });
});
