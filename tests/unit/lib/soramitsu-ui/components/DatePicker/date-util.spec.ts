import { describe, expect, it } from 'vitest';

import {
  getStartDateInCalendar,
  nextDate,
  prevDate,
  setTimeByString,
} from '@/lib/soramitsu-ui/components/DatePicker/date-util';

describe('date-util', () => {
  it('backs up a full week when the first day of the month is Sunday', () => {
    const result = getStartDateInCalendar(2023, 0);

    expect(result).toEqual(new Date(2022, 11, 25));
  });

  it('backs up to the previous Sunday for non-Sunday month starts', () => {
    const result = getStartDateInCalendar(2023, 2);

    expect(result).toEqual(new Date(2023, 1, 26));
  });

  it('moves dates backward and forward across month boundaries', () => {
    const source = new Date(2024, 0, 1);

    expect(prevDate(source)).toEqual(new Date(2023, 11, 31));
    expect(prevDate(source, 2)).toEqual(new Date(2023, 11, 30));
    expect(nextDate(new Date(2024, 0, 31))).toEqual(new Date(2024, 1, 1));
    expect(nextDate(new Date(2024, 0, 31), 2)).toEqual(new Date(2024, 1, 2));
  });

  it('sets hours and minutes while resetting seconds', () => {
    const result = setTimeByString(new Date(2024, 4, 10, 1, 2, 59), '14:35');

    expect(result).toEqual(new Date(2024, 4, 10, 14, 35, 0));
  });
});
