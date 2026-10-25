import type { GetTsSource } from './getTsFlow';
import type { GetTsPaymentAsset } from './getTsPlanQuote';

/**
 * Starting card budget on the Buy XOR start screen. In October 2026 it fit both MoonPay's minimum and the
 * SORA DAI/XOR market; it is only a prefilled value that the normal estimate checks like any other amount.
 */
export const BUY_XOR_DEFAULT_CARD_USD = '20';

export type BuyXorNextStep =
  | 'walletsEthereum'
  | 'walletSora'
  | 'walletsTon'
  | 'card'
  | 'ton'
  | 'convert'
  | 'transfer'
  | 'swap';

/**
 * The approvals a Buy XOR route needs, in order, for the "What happens next" list.
 * Describes the existing guided steps only; it never starts one.
 */
export function buyXorNextSteps(source: GetTsSource | null, asset?: GetTsPaymentAsset): BuyXorNextStep[] {
  switch (source) {
    case 'card':
      return ['walletsEthereum', 'card', 'convert', 'swap'];
    case 'ethereum':
      return ['walletsEthereum', asset === 'DAI' ? 'transfer' : 'convert', 'swap'];
    case 'ton':
      return ['walletsTon', 'ton', 'convert', 'swap'];
    case 'sora':
      return ['walletSora', 'swap'];
    default:
      return [];
  }
}
