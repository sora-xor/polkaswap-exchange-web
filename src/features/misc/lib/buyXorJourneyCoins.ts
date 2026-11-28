import ethSvg from '@/lib/soramitsu-ui/icons/icomoon/finance-eth-blue-16.svg?raw';
import xorSvg from '@/lib/soramitsu-ui/icons/icomoon/finance-XOR-16.svg?raw';

import type { BuyXorJourneyCoin } from './buyXorJourney';

/**
 * Logos printed on the journey bubbles, in route order (see `BUY_XOR_JOURNEY_COINS`): ETH on Ethereum, the same ETH on
 * SORA, then XOR. They are bundled brand assets, so the art makes no network requests and taints no canvas.
 */
export const BUY_XOR_JOURNEY_LOGOS: ReadonlyArray<{ symbol: BuyXorJourneyCoin; svg: string }> = [
  { symbol: 'ETH', svg: ethSvg },
  { symbol: 'ETH-SORA', svg: ethSvg },
  { symbol: 'XOR', svg: xorSvg },
];

/** The logo as a CSS `url()` value, for the drops shown when WebGL is unavailable. */
export function journeyLogoUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
