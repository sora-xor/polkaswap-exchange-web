import { Interface } from 'ethers';
import { describe, expect, it } from 'vitest';

import liveFixtures from './fixtures/tonswapConversion.json';
import { GET_TS_CARD_DAI, GET_TS_HASHI_DAI_BRIDGE } from '@/features/misc/lib/getTsCardReadiness';
import { describeTemporaryWalletRequest } from '@/features/misc/lib/temporaryWalletAction';

/** Receiver of the captured Symbiosis quotes in the fixture. */
const BUYER = '0x196A45c9ca4270bb714042b7254FbdB50277881B';
const token = new Interface(['function approve(address spender,uint256 amount) returns (bool)']);
const bridge = new Interface([
  'function sendERC20ToSidechain(bytes32 to,uint256 amount,address tokenAddress)',
  'function sendEthToSidechain(bytes32 to) payable',
]);
const SORA_ACCOUNT = `0x${'11'.repeat(32)}`;
const DAI_AMOUNT = 14_832_672_224_801_084_765n;

describe('temporary wallet transaction descriptions', () => {
  it('names the captured ETH → DAI conversion with the exact ETH sent and the enforced DAI minimum', () => {
    const { tx } = liveFixtures.eth;
    expect(describeTemporaryWalletRequest({ from: BUYER, to: tx.to, data: tx.data, value: tx.value })).toEqual({
      kind: 'convert',
      amount: '0.03015',
      minimum: '79.632537160917844209',
    });
  });

  it('shows a conversion paying DAI to another address, or spending USDT, as a plain contract call', () => {
    const { eth, usdt } = liveFixtures;
    const other = '0x0000000000000000000000000000000000000001';
    expect(
      describeTemporaryWalletRequest({ from: other, to: eth.tx.to, data: eth.tx.data, value: eth.tx.value })
    ).toEqual({
      kind: 'contract',
    });
    expect(
      describeTemporaryWalletRequest({ from: BUYER, to: usdt.tx.to, data: usdt.tx.data, value: usdt.tx.value })
    ).toEqual({ kind: 'contract' });
  });

  it('names the DAI approval and the transfer to SORA only for the canonical bridge and DAI contracts', () => {
    const approve = token.encodeFunctionData('approve', [GET_TS_HASHI_DAI_BRIDGE, DAI_AMOUNT]);
    const send = bridge.encodeFunctionData('sendERC20ToSidechain', [SORA_ACCOUNT, DAI_AMOUNT, GET_TS_CARD_DAI]);
    const request = (to: string, data: string, value = '0') =>
      describeTemporaryWalletRequest({ from: BUYER, to, data, value });

    expect(request(GET_TS_CARD_DAI, approve)).toEqual({ kind: 'allowBridge', amount: '14.832672224801084765' });
    // The bridge page approves the maximum uint256; that is shown as unlimited, never as a 60-digit amount.
    const unlimited = token.encodeFunctionData('approve', [GET_TS_HASHI_DAI_BRIDGE, (1n << 256n) - 1n]);
    expect(request(GET_TS_CARD_DAI, unlimited)).toEqual({ kind: 'allowBridgeAll' });
    expect(request(GET_TS_HASHI_DAI_BRIDGE, send)).toEqual({
      kind: 'bridge',
      asset: 'DAI',
      amount: '14.832672224801084765',
      recipient: SORA_ACCOUNT,
    });

    const otherSpender = token.encodeFunctionData('approve', [BUYER, DAI_AMOUNT]);
    const otherToken = bridge.encodeFunctionData('sendERC20ToSidechain', [SORA_ACCOUNT, DAI_AMOUNT, BUYER]);
    expect(request(GET_TS_CARD_DAI, otherSpender)).toEqual({ kind: 'contract' });
    expect(request(BUYER, approve)).toEqual({ kind: 'contract' });
    expect(request(GET_TS_HASHI_DAI_BRIDGE, otherToken)).toEqual({ kind: 'contract' });
    expect(request(GET_TS_HASHI_DAI_BRIDGE, send, '1')).toEqual({ kind: 'contract' });
    expect(request(GET_TS_CARD_DAI, '0x095ea7b3')).toEqual({ kind: 'contract' });
  });

  it('names the ETH transfer to SORA with the ETH it sends, only on the canonical bridge', () => {
    const sendEth = bridge.encodeFunctionData('sendEthToSidechain', [SORA_ACCOUNT]);
    const request = (to: string, value: string) =>
      describeTemporaryWalletRequest({ from: BUYER, to, data: sendEth, value });
    expect(request(GET_TS_HASHI_DAI_BRIDGE, '6228718750000000')).toEqual({
      kind: 'bridge',
      asset: 'ETH',
      amount: '0.00622871875',
      recipient: SORA_ACCOUNT,
    });
    // Sending nothing, or to another contract, is not the purchase's transfer.
    expect(request(GET_TS_HASHI_DAI_BRIDGE, '0')).toEqual({ kind: 'contract' });
    expect(request(BUYER, '6228718750000000')).toEqual({ kind: 'contract' });
  });

  it('names a plain ETH transfer and leaves everything else generic', () => {
    expect(describeTemporaryWalletRequest({ from: BUYER, to: BUYER, data: '0x', value: '1500000000000000' })).toEqual({
      kind: 'send',
      amount: '0.0015',
    });
    expect(describeTemporaryWalletRequest({ from: BUYER, to: BUYER, data: '0x', value: '0' })).toEqual({
      kind: 'contract',
    });
    expect(describeTemporaryWalletRequest({ from: BUYER, to: BUYER, data: '0xdeadbeef', value: '0' })).toEqual({
      kind: 'contract',
    });
  });
});
