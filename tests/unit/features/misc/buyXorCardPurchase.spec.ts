import { Interface } from 'ethers';
import { describe, expect, it } from 'vitest';

import liveFixtures from './fixtures/tonswapConversion.json';
import {
  BUY_XOR_MIN_BRIDGE_WEI,
  buyXorRunSteps,
  createBuyXorPurchasePolicy,
  isBuyXorBridgeableBalance,
  planBuyXorBridgeAmount,
} from '@/features/misc/lib/buyXorCardPurchase';
import { GET_TS_CARD_DAI, GET_TS_HASHI_DAI_BRIDGE } from '@/features/misc/lib/getTsCardReadiness';

/** Receiver of the captured Symbiosis ETH → DAI quote in the fixture. */
const WALLET = '0x196A45c9ca4270bb714042b7254FbdB50277881B';
const SORA = `0x${'11'.repeat(32)}`;
const OTHER_SORA = `0x${'22'.repeat(32)}`;
const token = new Interface(['function approve(address spender,uint256 amount) returns (bool)']);
const bridge = new Interface([
  'function sendERC20ToSidechain(bytes32 to,uint256 amount,address tokenAddress)',
  'function sendEthToSidechain(bytes32 to) payable',
]);
const GWEI = 1_000_000_000n;
const figures = { gasLimit: '1', maxFeePerGas: '1', estimatedFee: '1', maxFee: '1' };

describe('Buy XOR card run steps', () => {
  it('marks earlier steps done, the current one active or failed, and later ones to do', () => {
    expect(buyXorRunSteps('send')).toEqual([
      { id: 'pay', status: 'done' },
      { id: 'receive', status: 'done' },
      { id: 'send', status: 'active' },
      { id: 'arrive', status: 'todo' },
      { id: 'swap', status: 'todo' },
    ]);
    expect(buyXorRunSteps('send', true).map((step) => step.status)).toEqual(['done', 'done', 'failed', 'todo', 'todo']);
    expect(buyXorRunSteps('pay')[0].status).toBe('active');
    expect(buyXorRunSteps('done').every((step) => step.status === 'done')).toBe(true);
  });
});

describe('Buy XOR bridge sizing', () => {
  it('sends the balance minus 25 % extra gas at 2 × base fee plus the highest tip, and 5 % headroom', () => {
    const balance = 6_400_000_000_000_000n;
    // 1.25 × 26,100 = 32,625 gas at 2 × 1 gwei + 3 gwei.
    const reserve = 32_625n * 5n * GWEI;
    const margin = (reserve * 500n + 9_999n) / 10_000n;
    expect(planBuyXorBridgeAmount({ balance, gas: 26_100n, baseFee: GWEI })).toBe(balance - reserve - margin);
    expect(planBuyXorBridgeAmount({ balance, gas: 26_100n, baseFee: GWEI })).toBe(6_228_718_750_000_000n);
    // A known lower tip keeps more for the transfer.
    expect(planBuyXorBridgeAmount({ balance, gas: 26_100n, baseFee: GWEI, tip: GWEI })!).toBeGreaterThan(
      6_228_718_750_000_000n
    );
  });

  it('waits instead of sending dust, or when fees take the whole balance', () => {
    const base = { gas: 30_000n, baseFee: 2n * GWEI };
    const reserve = 37_500n * 7n * GWEI;
    const threshold = BUY_XOR_MIN_BRIDGE_WEI + reserve + (reserve * 500n + 9_999n) / 10_000n;
    expect(planBuyXorBridgeAmount({ ...base, balance: threshold })).toBe(BUY_XOR_MIN_BRIDGE_WEI);
    expect(planBuyXorBridgeAmount({ ...base, balance: threshold - 1n })).toBeNull();
    expect(planBuyXorBridgeAmount({ ...base, balance: 0n })).toBeNull();
    expect(planBuyXorBridgeAmount({ ...base, balance: 10n ** 18n, gas: 0n })).toBeNull();
    expect(planBuyXorBridgeAmount({ ...base, balance: 10n ** 18n, baseFee: -1n })).toBeNull();
  });

  it('tells ETH worth sending from the fee reserve a finished purchase leaves behind, without an estimate', () => {
    // 0.0005 ETH, plus 1.25 × 30,000 gas at 2 × 1 gwei + 3 gwei, plus 5 %.
    const reserve = 37_500n * 5n * GWEI;
    const threshold = BUY_XOR_MIN_BRIDGE_WEI + reserve + (reserve * 500n + 9_999n) / 10_000n;
    expect(threshold).toBe(696_875_000_000_000n);
    expect(isBuyXorBridgeableBalance(threshold, GWEI)).toBe(true);
    expect(isBuyXorBridgeableBalance(threshold - 1n, GWEI)).toBe(false);
    // About what is left after a purchase (the unused fee reserve), and a MoonPay delivery for a 20 USD purchase.
    expect(isBuyXorBridgeableBalance(150_000_000_000_000n, GWEI)).toBe(false);
    expect(isBuyXorBridgeableBalance(6_400_000_000_000_000n, GWEI)).toBe(true);
  });
});

describe('Buy XOR purchase signing policy', () => {
  const policy = createBuyXorPurchasePolicy({ wallet: WALLET, soraRecipientHex: SORA });
  const request = (to: string, data: string, value = '0', from = WALLET.toLowerCase()) => ({
    from,
    to,
    data,
    value,
    ...figures,
  });
  const approve = (spender: string, amount: bigint) => token.encodeFunctionData('approve', [spender, amount]);
  const send = (recipient: string) =>
    bridge.encodeFunctionData('sendERC20ToSidechain', [recipient, 10n ** 19n, GET_TS_CARD_DAI]);
  const sendEth = (recipient: string) => bridge.encodeFunctionData('sendEthToSidechain', [recipient]);

  it('signs the ETH transfer to the buyer’s SORA account', () => {
    expect(policy(request(GET_TS_HASHI_DAI_BRIDGE, sendEth(SORA), '6000000000000000'))).toBe(true);
  });

  it('still signs the allowance and transfer for DAI left from the earlier DAI route', () => {
    expect(policy(request(GET_TS_CARD_DAI, approve(GET_TS_HASHI_DAI_BRIDGE, 10n ** 19n)))).toBe(true);
    expect(policy(request(GET_TS_CARD_DAI, approve(GET_TS_HASHI_DAI_BRIDGE, (1n << 256n) - 1n)))).toBe(true);
    expect(policy(request(GET_TS_HASHI_DAI_BRIDGE, send(SORA)))).toBe(true);
  });

  it('asks for anything else: the swap to DAI, another SORA account, another sender, other contracts', () => {
    const { eth, usdt } = liveFixtures;
    // Card purchases no longer convert ETH to DAI, so a conversion is not this purchase's transaction.
    expect(policy(request(eth.tx.to, eth.tx.data, eth.tx.value))).toBe(false);
    expect(policy(request(GET_TS_HASHI_DAI_BRIDGE, sendEth(OTHER_SORA), '6000000000000000'))).toBe(false);
    expect(
      policy(
        request(
          GET_TS_HASHI_DAI_BRIDGE,
          sendEth(SORA),
          '6000000000000000',
          '0x0000000000000000000000000000000000000001'
        )
      )
    ).toBe(false);
    expect(policy(request(GET_TS_HASHI_DAI_BRIDGE, send(OTHER_SORA)))).toBe(false);
    expect(policy(request(eth.tx.to, eth.tx.data, eth.tx.value, '0x0000000000000000000000000000000000000001'))).toBe(
      false
    );
    expect(policy(request(usdt.tx.to, usdt.tx.data, usdt.tx.value))).toBe(false);
    expect(policy(request(GET_TS_CARD_DAI, approve(WALLET, 10n ** 19n)))).toBe(false);
    expect(policy(request(WALLET, '0x', '1000'))).toBe(false);
    expect(policy(request(GET_TS_HASHI_DAI_BRIDGE, '0xdeadbeef'))).toBe(false);
  });

  it('refuses everything when the wallet or SORA account is malformed', () => {
    const transfer = request(GET_TS_HASHI_DAI_BRIDGE, sendEth(SORA), '6000000000000000');
    expect(createBuyXorPurchasePolicy({ wallet: 'nope', soraRecipientHex: SORA })(transfer)).toBe(false);
    expect(createBuyXorPurchasePolicy({ wallet: WALLET, soraRecipientHex: '0x11' })(transfer)).toBe(false);
  });
});
