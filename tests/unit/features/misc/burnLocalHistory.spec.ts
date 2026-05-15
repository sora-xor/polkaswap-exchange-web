import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it, vi } from 'vitest';

import {
  createLocalXorBurns,
  getBlockHeightFromBlockId,
  getCurrentChainBlockHeight,
  getLocalTxHash,
  isLocalXorBurn,
  resolveBlockHeightFromHeader,
  resolveCurrentEndBlock,
  type ChainApiHeaderShape,
  type LocalBurnHistoryItem,
} from '@/features/misc/lib/burnLocalHistory';

const validSoraNexusAccount = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

const localBurn = (overrides: Partial<LocalBurnHistoryItem> = {}): LocalBurnHistoryItem =>
  ({
    id: 'local-id',
    type: Operation.Burn,
    assetAddress: XOR.address,
    amount: '2',
    ...overrides,
  }) as LocalBurnHistoryItem;

const createChainApi = (getHeader: ChainApiHeaderShape['rpc']['chain']['getHeader']): ChainApiHeaderShape => ({
  rpc: {
    chain: {
      getHeader,
    },
  },
});

describe('burn local history helpers', () => {
  it('detects local XOR burns and resolves wallet history transaction hashes', () => {
    expect(getLocalTxHash(localBurn({ txId: '0xtx', id: 'fallback' }))).toBe('0xtx');
    expect(getLocalTxHash(localBurn({ txId: '', id: 'fallback' }))).toBe('fallback');
    expect(isLocalXorBurn(localBurn())).toBe(true);
    expect(isLocalXorBurn(localBurn({ type: Operation.Swap }))).toBe(false);
    expect(isLocalXorBurn(localBurn({ assetAddress: 'other' }))).toBe(false);
    expect(isLocalXorBurn(localBurn({ amount: '' }))).toBe(false);
    expect(isLocalXorBurn(localBurn({ id: '', txId: '' }))).toBe(false);
  });

  it('resolves finite block heights from current and historical chain headers', async () => {
    const getHeader = vi.fn(async (blockHash?: string) => ({
      number: {
        toString: () => (blockHash === '0xblock' ? '124' : '123'),
      },
    }));
    const chainApi = createChainApi(getHeader);

    expect(resolveBlockHeightFromHeader({ number: { toString: () => '42' } })).toBe(42);
    expect(resolveBlockHeightFromHeader({ number: { toString: () => 'not-a-number' } })).toBeNull();
    await expect(getCurrentChainBlockHeight(chainApi)).resolves.toBe(123);
    await expect(getBlockHeightFromBlockId(chainApi, '0xblock')).resolves.toBe(124);
    expect(getHeader).toHaveBeenCalledWith();
    expect(getHeader).toHaveBeenCalledWith('0xblock');
  });

  it('returns null for disconnected or unavailable chain headers', async () => {
    await expect(getCurrentChainBlockHeight(null)).resolves.toBeNull();
    await expect(getCurrentChainBlockHeight({ isConnected: false })).resolves.toBeNull();
    await expect(getBlockHeightFromBlockId(null, '0xblock')).resolves.toBeNull();
    await expect(getBlockHeightFromBlockId(createChainApi(vi.fn(async () => null)), undefined)).resolves.toBeNull();
  });

  it('resolves the campaign query end block from app state, chain state, and campaign bounds', () => {
    expect(resolveCurrentEndBlock({ blockNumber: 150, minBlock: 100, maxBlock: 200 })).toBe(150);
    expect(resolveCurrentEndBlock({ blockNumber: 250, minBlock: 100, maxBlock: 200 })).toBe(200);
    expect(resolveCurrentEndBlock({ blockNumber: 0, minBlock: 100, maxBlock: 200, chainBlockHeight: 180 })).toBe(180);
    expect(resolveCurrentEndBlock({ blockNumber: 0, minBlock: 100, maxBlock: 200, chainBlockHeight: 250 })).toBe(200);
    expect(resolveCurrentEndBlock({ blockNumber: 0, minBlock: 100, maxBlock: 200, chainBlockHeight: null })).toBe(200);
  });

  it('converts optimistic wallet history into burn statistics rows', async () => {
    const remark = JSON.stringify({
      type: 'soraNexusXorClaim',
      version: 1,
      recipient: validSoraNexusAccount,
    });
    const resolveBlockHeightByBlockId = vi.fn(async (blockId?: string) => (blockId === '0xblock' ? 123 : null));

    const rows = await createLocalXorBurns({
      address: 'sora-account',
      fallbackBlockHeight: 999,
      localHistory: [
        localBurn({ txId: '0xexact', blockHeight: 120, amount: '2', comment: remark }),
        localBurn({ txId: '0xresolved', blockId: '0xblock', amount: '3' }),
        localBurn({ txId: '0xfallback', amount: '4' }),
        localBurn({ txId: '0xignored', assetAddress: 'other', amount: '5' }),
      ],
      resolveBlockHeightByBlockId,
    });

    expect(rows.map((row) => row.txHash)).toEqual(['0xexact', '0xresolved', '0xfallback']);
    expect(rows.map((row) => row.amount.toString())).toEqual(['2', '3', '4']);
    expect(rows.map((row) => row.blockHeight)).toEqual([120, 123, 999]);
    expect(rows.map((row) => row.displayBlockHeight)).toEqual([120, 123, null]);
    expect(rows[0]?.nexusRecipient).toBe(validSoraNexusAccount);
    expect(resolveBlockHeightByBlockId).toHaveBeenCalledWith('0xblock');
    expect(resolveBlockHeightByBlockId).toHaveBeenCalledWith(undefined);
  });

  it('skips local burn conversion when the account is absent or excluded', async () => {
    const resolveBlockHeightByBlockId = vi.fn(async () => 123);

    await expect(
      createLocalXorBurns({
        address: null,
        fallbackBlockHeight: 999,
        localHistory: [localBurn()],
        resolveBlockHeightByBlockId,
      })
    ).resolves.toEqual([]);
    await expect(
      createLocalXorBurns({
        address: 'excluded',
        fallbackBlockHeight: 999,
        localHistory: [localBurn()],
        resolveBlockHeightByBlockId,
        isExcludedAddress: (address) => address === 'excluded',
      })
    ).resolves.toEqual([]);
    expect(resolveBlockHeightByBlockId).not.toHaveBeenCalled();
  });
});
