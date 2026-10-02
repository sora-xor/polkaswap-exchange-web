import { describe, expect, it } from 'vitest';
import { parseResearchCsv, RESEARCH_IMPORT_MAX_BYTES } from '@/features/bot-trading/research-import';

const start = Date.UTC(2026, 0, 1);
const now = start + 100 * 3600000;
/** Exact local fixture: no network data or JavaScript price calculations. */
function csv(transform: (line: string, index: number) => string = (line) => line): string {
  return (
    'timestamp,close\n' +
    Array.from({ length: 30 }, (_, index) => transform(`${start + index * 3600000},2.000000000000000001`, index)).join(
      '\n'
    )
  );
}

describe('research CSV history', () => {
  it('preserves precise decimal strings and unverified provenance', () => {
    const result = parseResearchCsv(csv(), now);
    expect(result.candles).toHaveLength(30);
    expect(result.candles[0].close).toBe('2.000000000000000001');
    expect(result.denominationVerified).toBe(false);
    expect(result.missing).toBe(0);
  });
  it('accepts ISO UTC timestamps and reports gaps without inventing prices', () => {
    const text = csv((line, index) => `${new Date(start + (index + (index > 10 ? 1 : 0)) * 3600000).toISOString()},3`);
    const result = parseResearchCsv(text, now);
    expect(result.candles).toHaveLength(30);
    expect(result.missing).toBe(1);
    expect(parseResearchCsv(text.replaceAll('.000Z', 'Z'), now).candles).toEqual(result.candles);
  });
  it.each(['-1', '0', 'NaN', '1e4', '=SUM(A1)', '1.2.3'])('rejects malformed price %s', (price) => {
    expect(() =>
      parseResearchCsv(
        csv((line, index) => (index === 5 ? `${start + index * 3600000},${price}` : line)),
        now
      )
    ).toThrow('bots.research.importError');
  });
  it('rejects future, duplicate, short and oversized inputs', () => {
    expect(() => parseResearchCsv(csv(), start)).toThrow();
    expect(() =>
      parseResearchCsv(
        csv((line) => `${start},2`),
        now
      )
    ).toThrow();
    expect(() => parseResearchCsv('timestamp,close\n1,2', now)).toThrow();
    expect(() => parseResearchCsv(' '.repeat(RESEARCH_IMPORT_MAX_BYTES + 1), now)).toThrow();
    expect(() => parseResearchCsv(csv().replace('timestamp,close', 'date,price'), now)).toThrow();
  });
});
