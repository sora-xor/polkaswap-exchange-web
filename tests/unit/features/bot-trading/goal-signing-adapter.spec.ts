import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SignerPayloadJSON } from '@polkadot/types/types';
import type { GoalLiveDependencies } from '@/features/bot-trading/goal-live';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { PolkaswapAgentApi } from '@/features/agent-trading/types';
import { createBotLiveExecutor, type BotLiveExecutor } from '@/features/bot-trading/live';
import { readGoalSignedMortality } from '@/features/bot-trading/goal-mortality';
import { goalStorageBot } from './goal-storage-fixtures';
import { executionStatus } from './execution-fixtures';
import { goalSigningFixture } from './goal-signing-fixture';

vi.unmock('@polkadot/util-crypto');
const adapters = vi.hoisted(() => ({
  wallet: { api: {} as unknown },
  getWallet: vi.fn(),
  createGoal: vi.fn(),
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: adapters.wallet, connection: {} }));
vi.mock('@/lib/substrate/sdk/apiAccount', () => ({ SoraPrefix: 69 }));
vi.mock('@/lib/soraneo-wallet/src/services/wallet', () => ({
  getWallet: adapters.getWallet,
  isInternalSource: (source: string) => source === 'sora',
}));
vi.mock('@/features/agent-trading/service', () => ({ createPolkaswapAgentApi: vi.fn() }));
vi.mock('@/features/agent-trading/goal-preparation', () => ({ prepareOwnedGoalSwap: vi.fn() }));
vi.mock('@/features/bot-trading/goal-live', () => ({ createGoalLiveExecutor: adapters.createGoal }));
const active: BotLiveExecutor[] = [];
afterEach(() => {
  for (const executor of active.splice(0)) executor.dispose();
  vi.clearAllMocks();
});

/** Exercises the production default signer; all wallet and RPC inputs are synthetic. */
async function harness() {
  const f = goalSigningFixture();
  const bot = goalStorageBot();
  bot.account = f.pair.address;
  const status = executionStatus();
  status.wallet.address = f.pair.address;
  status.wallet.source = 'polkadot-js';
  const signPayload = vi.fn(async (payload: SignerPayloadJSON) => ({
    id: 1,
    ...f.registry.createType('ExtrinsicPayload', payload, { version: 4 }).sign(f.pair),
  }));
  adapters.getWallet.mockResolvedValue({
    getAccounts: async () => [{ address: f.pair.address }],
    signer: { signPayload },
  });
  let version = '0x82';
  const client = {
    isConnected: true,
    runtimeVersion: {
      specVersion: { toNumber: () => 130 },
      transactionVersion: { toNumber: () => 130 },
      toHex: () => version,
    },
    runtimeMetadata: { toHex: () => f.identity.metadataHex },
    genesisHash: { toHex: () => f.identity.genesisHash },
    rpc: { system: { accountNextIndex: vi.fn(async () => 7) } },
  };
  adapters.wallet.api = client;
  let dependencies!: GoalLiveDependencies;
  adapters.createGoal.mockImplementation((_storage: unknown, input: GoalLiveDependencies) => {
    dependencies = input;
    return { previewAllocation: async () => ({ sufficient: true, assets: [] }), dispose: vi.fn() };
  });
  const storage = { goals: { pause: vi.fn() } } as unknown as GoalEnabledBotStorage;
  const executor = createBotLiveExecutor(storage, { status: () => status } as PolkaswapAgentApi, {
    goal: { qualification: vi.fn() },
  });
  active.push(executor);
  await executor.previewAllocation(bot);
  const signer = await dependencies.signer(bot);
  return {
    f,
    signer,
    client,
    signPayload,
    changeRuntime: () => {
      version = '0x83';
    },
  };
}

describe('production goal signer dispatch', () => {
  it('captures the actual SDK checkpoint through the default external wallet adapter', async () => {
    const h = await harness();
    const signed = await h.signer.sign(h.f.transaction);
    expect(signed).toBe(h.f.transaction);
    expect(h.signPayload).toHaveBeenCalledOnce();
    expect(readGoalSignedMortality(signed)).toMatchObject({
      checkpoint: { height: 335 },
      nonceCodec: '7',
      deathBlockNumber: 399,
    });
    h.signer.lock();
    await expect(h.signer.sign(h.f.transaction)).rejects.toThrow('bots.errors.session');
    expect(h.signPayload).toHaveBeenCalledOnce();
  });
  it.each(['runtime', 'client', 'stop'] as const)(
    'refuses %s changes during the nonce read before signing',
    async (change) => {
      const h = await harness();
      h.client.rpc.system.accountNextIndex.mockImplementationOnce(async () => {
        if (change === 'runtime') h.changeRuntime();
        if (change === 'client') adapters.wallet.api = { ...h.client };
        if (change === 'stop') h.signer.lock();
        return 7;
      });
      await expect(h.signer.sign(h.f.transaction)).rejects.toThrow('bots.errors.session');
      expect(h.signPayload).not.toHaveBeenCalled();
      expect(h.f.signAsync).not.toHaveBeenCalled();
    }
  );
});
// @vitest-environment node
