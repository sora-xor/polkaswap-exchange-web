import { parseBotPrice } from './engine';
import type { BotHistory } from './types';

/** Maximum UTF-8 upload size; the parser independently limits characters and observations. */
export const RESEARCH_IMPORT_MAX_BYTES = 2_000_000;

/**
 * Read normalized pair closes from a local CSV. Accepted columns are timestamp,
 * close and optional feeClose. Times are Unix milliseconds or ISO UTC dates.
 * Imported prices retain unverified provenance; parsing is not chain evidence.
 * A constant cadence makes missing buckets explicit without filling any gaps.
 */
export function parseResearchCsv(text: string, now = Date.now(), requireFeeClose = false): BotHistory {
  const invalid = () => new Error('bots.research.importError');
  if (typeof text !== 'string' || text.length > RESEARCH_IMPORT_MAX_BYTES || !Number.isSafeInteger(now)) {
    throw invalid();
  }
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const headers = lines
    .shift()
    ?.split(',')
    .map((cell) => cell.trim());
  if (!headers || !['timestamp,close', 'timestamp,close,feeClose'].includes(headers.join(','))) throw invalid();
  if (requireFeeClose && headers.length !== 3) throw invalid();
  if (lines.length < 20 || lines.length > 10000) throw invalid();
  let previous = -1;
  const candles = lines.map((line) => {
    const values = line.split(',').map((cell) => cell.trim());
    if (values.length !== headers.length) throw invalid();
    const [time, close, feeClose = '1'] = values;
    if (!/^(0|[1-9]\d{0,15})$/.test(time) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(time)) {
      throw invalid();
    }
    const timestamp = time.endsWith('Z') ? Date.parse(time) : Number(time);
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp <= previous || timestamp >= now) throw invalid();
    if (
      time.endsWith('Z') &&
      new Date(timestamp).toISOString() !== (time.includes('.') ? time : time.replace('Z', '.000Z'))
    )
      throw invalid();
    try {
      parseBotPrice(close);
      parseBotPrice(feeClose);
    } catch {
      throw invalid();
    }
    if (!requireFeeClose && feeClose !== '1') throw invalid();
    previous = timestamp;
    return { timestamp, close, feeClose };
  });
  const cadence = Math.min(...candles.slice(1).map((candle, index) => candle.timestamp - candles[index].timestamp));
  if (cadence < 60_000) throw invalid();
  let missing = 0;
  for (let index = 1; index < candles.length; index++) {
    const gap = candles[index].timestamp - candles[index - 1].timestamp;
    if (gap % cadence) throw invalid();
    missing += gap / cadence - 1;
  }
  if (!Number.isSafeInteger(missing) || missing > 10000) throw invalid();
  return { candles, missing, denominationVerified: false };
}
