import { describeTemporaryWalletRequest } from './temporaryWalletAction';
import { TEMPORARY_WALLET_MAX_TIP } from '@/utils/connection/evm/temporaryWallet';
import type { TemporaryWalletAutoApproval } from '@/utils/connection/evm/temporaryWalletSession';

/**
 * Card purchase steps after the buyer pays: MoonPay's ETH arrives in the purchase wallet, is sent over the SORA bridge,
 * and the buyer swaps the ETH for XOR on SORA. With the temporary wallet the page signs the bridge transfer itself
 * (see `createBuyXorPurchasePolicy`); with the buyer's own wallet, their wallet asks.
 */
export type BuyXorRunStep = 'pay' | 'receive' | 'send' | 'arrive' | 'swap';
export const BUY_XOR_RUN_STEPS: readonly BuyXorRunStep[] = ['pay', 'receive', 'send', 'arrive', 'swap'];
export type BuyXorRunStepStatus = 'done' | 'active' | 'failed' | 'todo';

/** Less than this is dust: not worth a bridge transfer and its network fee. */
export const BUY_XOR_MIN_BRIDGE_WEI = 500_000_000_000_000n;
/** Gas of the ETH transfer to SORA when no estimate is at hand; `sendEthToSidechain` used about 26,100 in October 2026. */
export const BUY_XOR_TYPICAL_BRIDGE_GAS = 30_000n;
/** Extra headroom on top of the gas reserve, for fee changes between the estimate and the signature. */
const RESERVE_MARGIN_BPS = 500n;

/** Status of every step for the step list: earlier steps are done, the current one is active or failed. */
export function buyXorRunSteps(
  current: BuyXorRunStep | 'done',
  failed = false
): Array<{ id: BuyXorRunStep; status: BuyXorRunStepStatus }> {
  const index = current === 'done' ? BUY_XOR_RUN_STEPS.length : BUY_XOR_RUN_STEPS.indexOf(current);
  return BUY_XOR_RUN_STEPS.map((id, position) => ({
    id,
    status: position < index ? 'done' : position === index ? (failed ? 'failed' : 'active') : 'todo',
  }));
}

/**
 * ETH to send to SORA when the whole temporary wallet balance moves on. The temporary wallet signs with 25 % extra gas
 * at `2 × baseFee + tip` (`planTemporaryWalletFees`); this keeps that at the highest tip it pays, plus 5 %, so the
 * transfer never fails for fees. Returns `null` when what is left would be dust (nothing has arrived yet, or fees take
 * it all).
 */
export function planBuyXorBridgeAmount({
  balance,
  gas,
  baseFee,
  tip = TEMPORARY_WALLET_MAX_TIP,
}: {
  balance: bigint;
  gas: bigint;
  baseFee: bigint;
  tip?: bigint;
}): bigint | null {
  if (balance <= 0n || gas <= 0n || baseFee < 0n || tip < 0n) return null;
  const reserve = ((gas * 125n + 99n) / 100n) * (baseFee * 2n + tip);
  const margin = (reserve * RESERVE_MARGIN_BPS + 9_999n) / 10_000n;
  const amount = balance - reserve - margin;
  return amount >= BUY_XOR_MIN_BRIDGE_WEI ? amount : null;
}

/**
 * Whether ETH in a purchase wallet is worth sending to SORA at `baseFee`, judged without an estimate (typical gas). The
 * ETH left over after a purchase (unused fee reserve) is below this, so it neither starts a transfer nor counts as an
 * unfinished purchase; the next delivery takes it along.
 */
export function isBuyXorBridgeableBalance(balance: bigint, baseFee: bigint): boolean {
  return planBuyXorBridgeAmount({ balance, gas: BUY_XOR_TYPICAL_BRIDGE_GAS, baseFee }) !== null;
}

/**
 * The transactions the page may sign without asking during a card purchase with the temporary wallet: the bridge
 * transfer of ETH (or of DAI left from the earlier DAI route) to the buyer's own SORA account (`soraRecipientHex`, the
 * account's public key as bytes32 hex), and the DAI allowance for the canonical SORA bridge that a DAI transfer needs.
 * Anything else, including a transfer to another SORA account, still opens the approval dialog.
 */
export function createBuyXorPurchasePolicy({
  wallet,
  soraRecipientHex,
}: {
  wallet: string;
  soraRecipientHex: string;
}): TemporaryWalletAutoApproval {
  const account = wallet.toLowerCase();
  const recipient = soraRecipientHex.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(account) || !/^0x[0-9a-f]{64}$/.test(recipient)) return () => false;
  return (request) => {
    if (request.from.toLowerCase() !== account) return false;
    const action = describeTemporaryWalletRequest(request);
    switch (action.kind) {
      case 'allowBridge':
      case 'allowBridgeAll':
        return true;
      case 'bridge':
        return action.recipient === recipient;
      default:
        return false;
    }
  };
}
