import { codec } from './amounts';
import type { BotDefinition } from './types';

/** The unspent fee allowance remains reserved; only actual paid fees reduce this floor. */
export function remainingFeeReserveCodec(bot: BotDefinition): string {
  const remaining = codec(bot.policy.feeBudgetCodec) - codec(bot.portfolio.feesPaidCodec);
  return (remaining > 0n ? remaining : 0n).toString();
}

/** Return allocated trade capital without exposing the remaining fee reserve to a strategy. */
export function spendableHoldingCodec(bot: BotDefinition, asset: string): string {
  if (codec(bot.portfolio.xorDeficitCodec ?? '0') > 0n) return '0';
  const held = codec(bot.portfolio.holdings[asset] ?? '0');
  const reserve = asset === bot.policy.feeAsset.address ? codec(remainingFeeReserveCodec(bot)) : 0n;
  return (held > reserve ? held - reserve : 0n).toString();
}

/**
 * Check input and fees against existing allocation before any output credit. The
 * current fee belongs to the protected reserve, so it is never reserved twice.
 * Legacy underfunded reserves fail closed instead of borrowing future proceeds.
 */
export function assertTradeFunds(bot: BotDefinition, inputAsset: string, inputCodec: string, feeCodec = '0'): void {
  const fee = codec(feeCodec);
  if (codec(bot.portfolio.xorDeficitCodec ?? '0') > 0n) throw new Error('bots.errors.balance');
  if (codec(bot.portfolio.feesPaidCodec) + fee > codec(bot.policy.feeBudgetCodec)) {
    throw new Error('bots.errors.feeBudget');
  }
  const reserve = codec(remainingFeeReserveCodec(bot));
  const feeHeld = codec(bot.portfolio.holdings[bot.policy.feeAsset.address] ?? '0');
  if (feeHeld < reserve || codec(inputCodec) > codec(spendableHoldingCodec(bot, inputAsset))) {
    throw new Error('bots.errors.balance');
  }
}
