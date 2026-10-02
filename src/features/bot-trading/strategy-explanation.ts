import { codec, fromCodec, toCodec } from './amounts';
import type { PlaygroundSettings } from './playground';

/** Public settings needed to explain a deterministic rule without a wallet or market connection. */
export type StrategyFlowSettings = Pick<
  PlaygroundSettings,
  | 'preset'
  | 'capital'
  | 'tradePercent'
  | 'intervalBlocks'
  | 'intervalHours'
  | 'thresholdPercent'
  | 'fastWindow'
  | 'slowWindow'
>;

/** Display the fixed share of starting capital using exact decimals; this never constructs an order. */
export function explainedTradeAmount(settings: StrategyFlowSettings, decimals = 18): string {
  if (
    settings.capital.length > 100 ||
    !/^\d+(?:\.\d+)?$/.test(settings.capital) ||
    !Number.isInteger(settings.tradePercent) ||
    settings.tradePercent < 1 ||
    settings.tradePercent > 50
  )
    return '—';
  try {
    const capital = codec(toCodec(settings.capital, decimals));
    const amount = (capital * BigInt(settings.tradePercent)) / 100n;
    return amount > 0n ? fromCodec(amount.toString(), decimals) : '—';
  } catch {
    return '—';
  }
}
