import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBotLiveExecutor } from '@/features/bot-trading/live';
import { executionBot, executionStatus } from './execution-fixtures';
import type { BotLiveExecutor } from '@/features/bot-trading/live';
import type { BotStorage } from '@/features/bot-trading/storage';
import type { AgentPreparedSwap, PolkaswapAgentApi } from '@/features/agent-trading/types';

const signing = vi.hoisted(() => {
  const original = { isLocked: true, decodePkcs8: vi.fn(), lock: vi.fn() };
  const privatePair = { address: 'cn-account', decodePkcs8: vi.fn(), lock: vi.fn() };
  const json = {
    address: 'cn-account',
    encoded: 'encrypted-existing-key',
    encoding: { type: ['scrypt', 'xsalsa20-poly1305'] },
    meta: {},
  };
  return {
    original,
    privatePair,
    json,
    createFromJson: vi.fn((_json: unknown) => privatePair),
    getWallet: vi.fn(),
    approvePrepared: vi.fn(),
    externalSigner: { signPayload: vi.fn() },
    api: {
      api: { rpc: { system: { accountNextIndex: vi.fn(async () => 7) } } },
      accountPair: original,
      keyring: { accounts: { subject: { getValue: () => ({ account: { json } }) } } },
    },
  };
});
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: signing.api, connection: {} }));
vi.mock('@/lib/soraneo-wallet/src/services/wallet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/soraneo-wallet/src/services/wallet')>()),
  getWallet: signing.getWallet,
}));
vi.mock('@/features/bot-trading/policy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/policy')>()),
  // Envelope validation has its own integration tests; this suite isolates the actual wallet signer adapter.
  assertPrepared: signing.approvePrepared,
}));
vi.mock('@polkadot/keyring', () => ({
  Keyring: class {
    createFromJson = signing.createFromJson;
  },
}));

let executor: BotLiveExecutor | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  signing.getWallet.mockResolvedValue({
    getAccounts: async () => [{ address: 'cn-account' }],
    signer: signing.externalSigner,
  });
  signing.approvePrepared.mockResolvedValue(undefined);
});
afterEach(() => {
  executor?.dispose();
  vi.useRealTimers();
});

function harness(source = 'sora') {
  const status = executionStatus();
  status.wallet.source = source;
  const bot = executionBot();
  const allocate = vi.fn(async () => undefined);
  const storage = { listBots: async () => [bot], allocate } as unknown as BotStorage;
  const agent = { status: () => status } as PolkaswapAgentApi;
  executor = createBotLiveExecutor(storage, agent, {
    acquire: async () => () => undefined,
    balances: async () => bot.portfolio.holdings,
  });
  return { executor, bot, allocate };
}

describe('same existing wallet session key', () => {
  it('unlocks only a private clone of the encrypted existing account and locks it on Stop', async () => {
    const h = harness();
    await h.executor.authorize(h.bot, 'existing-wallet-password');
    expect(signing.createFromJson).toHaveBeenCalledWith(signing.json);
    expect(signing.createFromJson.mock.calls[0][0]).not.toBe(signing.json);
    expect(signing.privatePair.decodePkcs8).toHaveBeenCalledWith('existing-wallet-password');
    expect(signing.original.decodePkcs8).not.toHaveBeenCalled();
    expect(signing.original.isLocked).toBe(true);
    const persisted = JSON.stringify(h.allocate.mock.calls);
    expect(persisted).not.toContain('existing-wallet-password');
    expect(persisted).not.toContain('encrypted-existing-key');
    h.executor.stop(h.bot.id);
    expect(signing.privatePair.lock).toHaveBeenCalled();
  });
  it('unlocks the existing Google Drive account privately without expecting an external signer', async () => {
    const h = harness('google-drive');
    await h.executor.authorize(h.bot, 'existing-google-backup-password');
    expect(signing.createFromJson).toHaveBeenCalledWith(signing.json);
    expect(signing.privatePair.decodePkcs8).toHaveBeenCalledWith('existing-google-backup-password');
    expect(signing.original.decodePkcs8).not.toHaveBeenCalled();
    expect(h.allocate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.allocate.mock.calls)).not.toContain('existing-google-backup-password');
    h.executor.stop(h.bot.id);
    expect(signing.privatePair.lock).toHaveBeenCalled();
  });
  it('locks the clone when password verification fails and does not save a live allocation', async () => {
    const h = harness();
    signing.privatePair.decodePkcs8.mockImplementationOnce(() => {
      throw new Error('incorrect');
    });
    await expect(h.executor.authorize(h.bot, 'wrong')).rejects.toThrow('bots.errors.wallet');
    expect(h.allocate).not.toHaveBeenCalled();
    expect(signing.privatePair.lock).toHaveBeenCalled();
    expect(signing.original.decodePkcs8).not.toHaveBeenCalled();
  });
  it('expires the private signing key without requiring a subsequent trade', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.bot.policy.sessionDurationMs = 60_000;
    await h.executor.authorize(h.bot, 'password');
    await vi.advanceTimersByTimeAsync(60_001);
    expect(signing.privatePair.lock).toHaveBeenCalled();
  });
});

describe('existing external wallet signing', () => {
  it('uses the matching external account without cloning or unlocking the in-app key', async () => {
    const h = harness('polkadot-js');
    await h.executor.authorize(h.bot);
    expect(signing.getWallet).toHaveBeenCalledWith('polkadot-js');
    expect(h.allocate).toHaveBeenCalledTimes(1);
    expect(signing.createFromJson).not.toHaveBeenCalled();
    expect(signing.privatePair.decodePkcs8).not.toHaveBeenCalled();
    expect(signing.original.decodePkcs8).not.toHaveBeenCalled();
  });
  it('refuses an unavailable signer or an account not authorized by the extension', async () => {
    for (const wallet of [
      { getAccounts: async () => [{ address: 'cn-account' }], signer: null },
      { getAccounts: async () => [{ address: 'different-account' }], signer: signing.externalSigner },
    ]) {
      const h = harness('polkadot-js');
      signing.getWallet.mockResolvedValueOnce(wallet);
      await expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.wallet');
      expect(h.allocate).not.toHaveBeenCalled();
      h.executor.dispose();
    }
    expect(signing.createFromJson).not.toHaveBeenCalled();
  });
  it('passes the external signer to signAsync and waits for the user confirmation before any broadcast', async () => {
    const status = executionStatus();
    const bot = executionBot();
    let stored = bot;
    let reservedOrder: Parameters<BotStorage['reserve']>[0] | undefined;
    const storage = {
      listBots: async () => [stored],
      listOrders: vi.fn(async () => (reservedOrder ? [reservedOrder] : [])),
      allocate: async (next: typeof bot) => {
        stored = next;
      },
      reserve: vi.fn(async (order: Parameters<BotStorage['reserve']>[0]) => {
        reservedOrder = structuredClone(order);
      }),
      settle: vi.fn(async () => undefined),
      saveBot: vi.fn(async (next: typeof bot) => {
        stored = next;
      }),
    } as unknown as BotStorage;
    const prepared = {
      intentId: 'prepared-intent',
      quote: { minMaxCodec: '1' },
      envelope: {
        feeCeilings: [{ assetAddress: bot.policy.feeAsset.address, amountCodec: '1' }],
        preparedAt: Date.now(),
        expiresAt: Date.now() + 30_000,
        preparedAtBlock: 42,
        expiresAtBlock: 47,
        network: { genesisHash: bot.network, runtimeSpecVersion: status.node.runtimeSpecVersion },
        signer: { address: bot.account, source: status.wallet.source },
      },
    } as AgentPreparedSwap;
    const agent = { status: () => status, prepareSwap: async () => prepared } as unknown as PolkaswapAgentApi;
    let rejectConfirmation!: (reason: Error) => void;
    signing.externalSigner.signPayload.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectConfirmation = reject;
        })
    );
    const tx = {
      method: { section: 'liquidityProxy', method: 'swap', toHex: () => '0x1234' },
      paymentInfo: async () => ({ partialFee: { toString: () => '1' } }),
      signAsync: vi.fn(async (_account: string, options: { signer: typeof signing.externalSigner }) =>
        options.signer.signPayload({ address: bot.account })
      ),
      send: vi.fn(),
    };
    executor = createBotLiveExecutor(storage, agent, {
      acquire: async () => () => undefined,
      balances: async () => bot.portfolio.holdings,
      block: async () => 42,
      build: () => tx as never,
    });
    await executor.authorize(bot);
    const execution = executor.execute(bot, { action: 'buy', amount: '1', reason: 'test' });
    const result = execution.then(
      () => null,
      (error) => error
    );
    await vi.waitFor(() => expect(signing.externalSigner.signPayload).toHaveBeenCalledTimes(1));
    expect(tx.signAsync).toHaveBeenCalledWith(bot.account, { nonce: 7, era: 64, signer: signing.externalSigner });
    expect(tx.send).not.toHaveBeenCalled();
    expect(signing.createFromJson).not.toHaveBeenCalled();
    expect(signing.original.decodePkcs8).not.toHaveBeenCalled();
    rejectConfirmation(new Error('user rejected signature'));
    expect(await result).toEqual(new Error('user rejected signature'));
    expect(tx.send).not.toHaveBeenCalled();
    expect(storage.settle).toHaveBeenCalledWith(expect.any(String), {
      success: false,
      outputCodec: '0',
      actualFeeCodec: '0',
      unbroadcast: true,
    });
  });
});
