import { FPNumber } from '@sora-substrate/sdk';
import { Interface } from 'ethers';

import { GET_TS_CARD_DAI, GET_TS_HASHI_DAI_BRIDGE } from './getTsCardReadiness';
import { decodeTonswapConversionSwap, TONSWAP_CONVERSION_CONTRACTS } from './tonswapConversion';

/** What a temporary-wallet transaction does, in natural units, for the approval dialog. */
export type TemporaryWalletAction =
  | { kind: 'convert'; amount: string; minimum: string }
  | { kind: 'allowBridge'; amount: string }
  | { kind: 'allowBridgeAll' }
  | {
      kind: 'bridge';
      asset: 'DAI' | 'ETH';
      amount: string;
      /** SORA account public key as lower-case bytes32 hex. */
      recipient: string;
    }
  | { kind: 'send'; amount: string }
  | { kind: 'contract' };

const ETH_SENTINEL = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const TOKEN = new Interface(['function approve(address spender,uint256 amount) returns (bool)']);
const BRIDGE = new Interface([
  'function sendERC20ToSidechain(bytes32 to,uint256 amount,address tokenAddress)',
  'function sendEthToSidechain(bytes32 to) payable',
]);
const APPROVE = TOKEN.getFunction('approve')!.selector;
const SEND_TO_SORA = BRIDGE.getFunction('sendERC20ToSidechain')!.selector;
const SEND_ETH_TO_SORA = BRIDGE.getFunction('sendEthToSidechain')!.selector;

const natural = (value: bigint): string => FPNumber.fromCodecValue(value.toString(), 18).toString();
/** Allowances beyond any real DAI supply are unlimited; the bridge page approves the maximum uint256. */
const UNLIMITED = 1n << 128n;

/**
 * Names the purchase steps a temporary wallet signs: the ETH transfer to SORA (Buy XOR card purchases), and on the DAI
 * route the ETH → DAI conversion, the DAI approval for the SORA bridge and the DAI transfer, each only for the exact
 * contracts the purchase uses. Anything else, including a conversion that would pay DAI to another address, is shown
 * as a plain contract call with its raw recipient.
 */
export function describeTemporaryWalletRequest(request: {
  from: string;
  to: string;
  data: string;
  value: string;
}): TemporaryWalletAction {
  const to = request.to.toLowerCase();
  const data = request.data.toLowerCase();
  const value = BigInt(request.value);
  try {
    if (to === TONSWAP_CONVERSION_CONTRACTS.gateway.toLowerCase() && value > 0n) {
      const swap = decodeTonswapConversionSwap(data);
      if (
        swap &&
        swap.srcToken.toLowerCase() === ETH_SENTINEL &&
        swap.dstToken.toLowerCase() === GET_TS_CARD_DAI &&
        swap.dstReceiver.toLowerCase() === request.from.toLowerCase() &&
        swap.minReturnAmount > 0n
      )
        return { kind: 'convert', amount: natural(value), minimum: natural(swap.minReturnAmount) };
    }
    if (to === GET_TS_CARD_DAI && value === 0n && data.startsWith(APPROVE)) {
      const [spender, amount] = TOKEN.decodeFunctionData('approve', data);
      if (String(spender).toLowerCase() === GET_TS_HASHI_DAI_BRIDGE)
        return amount >= UNLIMITED ? { kind: 'allowBridgeAll' } : { kind: 'allowBridge', amount: natural(amount) };
    }
    if (to === GET_TS_HASHI_DAI_BRIDGE && value === 0n && data.startsWith(SEND_TO_SORA)) {
      const [recipient, amount, token] = BRIDGE.decodeFunctionData('sendERC20ToSidechain', data);
      if (String(token).toLowerCase() === GET_TS_CARD_DAI)
        return { kind: 'bridge', asset: 'DAI', amount: natural(amount), recipient: String(recipient).toLowerCase() };
    }
    if (to === GET_TS_HASHI_DAI_BRIDGE && value > 0n && data.startsWith(SEND_ETH_TO_SORA)) {
      const [recipient] = BRIDGE.decodeFunctionData('sendEthToSidechain', data);
      return { kind: 'bridge', asset: 'ETH', amount: natural(value), recipient: String(recipient).toLowerCase() };
    }
  } catch {
    // Calldata that does not decode is shown as a plain contract call.
  }
  if (data === '0x' && value > 0n) return { kind: 'send', amount: natural(value) };
  return { kind: 'contract' };
}
