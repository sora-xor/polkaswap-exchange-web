import { describe, expect, it } from 'vitest';

import { getMarketQuestion } from '@/features/polkamarkt/lib/marketQuestion';

describe('getMarketQuestion', () => {
  it.each([
    {
      question: 'Will US August 2026 PCE inflation exceed 3.7% year-on-year?',
      rules:
        "YES if BEA's first Personal Income and Outlays release for August reports the all-items PCE price index up >3.7% from August 2025; otherwise NO, including equality. Use the headline percentage at its published precision, not core or monthly inflation; ignore subsequent corrections and revisions. Source: bea.gov/news. If not published by 2026-10-07 23:59 UTC, cancel.",
    },
    {
      question: 'Will the Bank of Japan raise rates at its scheduled 2026-09-17/18 meeting?',
      rules:
        "YES if that meeting's official statement raises the uncollateralized overnight call-rate target above the target immediately before that decision; otherwise NO. Source: boj.or.jp/en/mopo/mpmsche_minu/. Bond-purchase changes do not count. If cancelled, the target becomes incomparable, or no decision is published by 2026-09-25 23:59 UTC, cancel.",
    },
    {
      question: 'Will the Fed cut rates at its scheduled 2026-09-15/16 FOMC meeting?',
      rules:
        "YES if that meeting's official statement sets the federal funds target range upper bound below the upper bound immediately before that decision; otherwise NO. Source: federalreserve.gov/monetarypolicy/fomccalendars.htm. Unscheduled decisions do not count. If the meeting is cancelled, no comparable target exists, or no statement is published by 2026-09-23 23:59 UTC, cancel.",
    },
    {
      question: "Will US Q2 2026 real GDP growth be above 1.5% in BEA's third estimate?",
      rules:
        'YES if the first publication of that release reports seasonally adjusted annualized quarter-on-quarter real GDP growth >1.5%; otherwise NO, including equality. Use the headline value at its published precision; ignore subsequent corrections and revisions. Source: bea.gov/news. Scheduled Sep 30. If the specified release is not published by 2026-10-07 23:59 UTC, cancel.',
    },
  ])('keeps the exact question and financial threshold: $question', ({ question, rules }) => {
    const title = `${question} ${rules}`;

    expect(getMarketQuestion(title)).toBe(question);
  });

  it('accepts a full-width question mark without requiring following whitespace', () => {
    expect(getMarketQuestion('日銀は利上げしますか？判定には公式発表を使用します。')).toBe('日銀は利上げしますか？');
  });

  it('trims surrounding whitespace while retaining the exact question text', () => {
    expect(getMarketQuestion('\u00a0\n Will inflation\n\t exceed 3.7%?\n YES if the release exceeds 3.7%.\t')).toBe(
      'Will inflation\n\t exceed 3.7%?'
    );
  });

  it('uses the first question when later rules contain another question', () => {
    expect(getMarketQuestion('Will rates fall? What happens if the meeting is cancelled? Cancel the market.')).toBe(
      'Will rates fall?'
    );
  });

  it.each([
    '  August inflation above 3.7%  ',
    '  Inflation above 3.7%. YES if the first release is above 3.7%; otherwise NO.  ',
    '  An outcome with\n\tno explicit question boundary  ',
    '  https://example.org/release?month=august  ',
    '  ?  ',
    '',
    '\n\t\u00a0',
  ])('preserves a title without a safe question boundary: %j', (title) => {
    expect(getMarketQuestion(title)).toBe(title.trim());
  });

  it.each(['https://example.org/release?month=august', 'www.example.org/release?month=august'])(
    'ignores a URL query marker before the question terminator: %s',
    (url) => {
      const question = `Will the release at ${url} report inflation above 3.7%?`;

      expect(getMarketQuestion(`${question} YES if the first release exceeds 3.7%.`)).toBe(question);
    }
  );
});
