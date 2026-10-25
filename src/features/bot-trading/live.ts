import { Keyring } from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsHex, sha256AsU8a } from '@polkadot/util-crypto';
import { createPolkaswapAgentApi } from '@/features/agent-trading/service';
import { buildSwapCall } from '@/features/agent-trading/swap-call';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { getWallet, isInternalSource } from '@/lib/soraneo-wallet/src/services/wallet';
import { SoraPrefix } from '@/lib/substrate/sdk/apiAccount';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec } from './amounts';
import { botAccountKey, sameBotAccount } from './account-identity';
import { assertTradeFunds } from './allocation';
import { assessGoalTradeAdmission } from './goalAdmission';
import { fetchBotMarketSnapshot } from './market';
import { readFinalizedDiscoveryCampaignMark } from './campaign-mark';
import { validateDiscoveryCampaign, type DiscoveryCampaign, type DiscoveryCampaignMark } from './campaign';
import {
  assertLegacyGoalRecords,
  copyGoalStorageData,
  hasGoalExecutionMarker,
  readGoalExecutionBot,
} from './goal-storage';
import {
  assertAllocations,
  assertPrepared,
  assertPreparedContext,
  assertQuote,
  assertSession,
  consentIdentity,
  pendingOrder,
  proposalInput,
  validatePolicy,
} from './policy';
import type { BotAsset, BotCandle, BotDefinition, BotOrder, BotSession, TradeProposal } from './types';
import type { PaperFill } from './engine';
import type { BotSettlement, BotStorage, DiscoveryCampaignStorage, GoalEnabledBotStorage } from './storage';
import type { GoalLiveDependencies, GoalLiveExecutor } from './goal-live';
import type { GoalExecutionBot } from './goal-execution-types';
import type { AgentPreparedSwap, PolkaswapAgentApi } from '@/features/agent-trading/types';
import type { AppWallet } from '@/lib/soraneo-wallet/src/consts';
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { Signer } from '@polkadot/types/types';

type Extrinsic = SubmittableExtrinsic<'promise'>;
interface SessionSigner {
  sign(tx: Extrinsic): Promise<Extrinsic>;
  lock(): void;
}
interface PrivateSession extends BotSession {
  identity: string;
  source: string;
  signer: SessionSigner;
  timer: ReturnType<typeof setTimeout>;
  campaignGrantId?: string;
  campaignId?: string;
}
export interface BotLiveDependencies {
  agent: PolkaswapAgentApi;
  now(): number;
  market: typeof fetchBotMarketSnapshot;
  campaignMark: typeof readFinalizedDiscoveryCampaignMark;
  balances(bot: BotDefinition): Promise<Record<string, string>>;
  signer(bot: BotDefinition, password?: string): Promise<SessionSigner>;
  build(prepared: AgentPreparedSwap): Extrinsic;
  block(): Promise<number>;
  receipt(order: BotOrder, candidateBlockHash?: string): Promise<BotSettlement | null>;
  acquire(key: string): Promise<() => void>;
  /** Explicit application dependency. A marker or public certificate alone never enables goal execution. */
  goal?: {
    qualification: GoalLiveDependencies['qualification'];
    client?: GoalLiveDependencies['client'];
  };
}
/** Read-only budget readiness; these values are not an allocation or permission to sign. */
export interface BotFundingPreview {
  sufficient: boolean;
  assets: Array<{ asset: BotAsset; availableCodec: string; requiredCodec: string }>;
}
export interface BotLiveExecutor {
  previewAllocation(bot: BotDefinition): Promise<BotFundingPreview>;
  /**
   * Grant a live session. `endsAt` continues an earlier run until its saved end; the session is
   * then never longer than a fresh grant, and an end already passed is refused.
   */
  authorize(bot: BotDefinition, password?: string, options?: { endsAt?: number }): Promise<void>;
  /** One built-in-wallet unlock for a fixed reviewed campaign of at most three bots. */
  authorizeCampaign(campaignId: string, password: string): Promise<void>;
  stopCampaign(campaignId: string): Promise<void>;
  execute(bot: BotDefinition, proposal: TradeProposal): Promise<void>;
  reconcile(bot: BotDefinition, candidateBlockHash?: string): Promise<void>;
  /** Revoke immediately. New-protocol goals additionally return a durable pause promise. */
  stop(botId: string): void | Promise<void>;
  dispose(): void;
}
export interface BotChainEvent {
  phase?: { isApplyExtrinsic: boolean; asApplyExtrinsic: { toNumber(): number } };
  event: { section: string; method: string; data: ArrayLike<unknown> };
}
const value = (item: unknown): string => {
  if (item && typeof item === 'object' && 'code' in item) return String(item.code);
  return String(item);
};
/** Decode only this extrinsic's finalized swap and fee events; never estimate settled proceeds. */
export function parseBotReceipt(order: BotOrder, records: readonly BotChainEvent[], txIndex: number): BotSettlement {
  let success = 0;
  let failed = 0;
  let outputCodec: string | undefined;
  let feeCodec: string | undefined;
  for (const record of records) {
    if (!record.phase?.isApplyExtrinsic || record.phase.asApplyExtrinsic.toNumber() !== txIndex) continue;
    const { section, method, data } = record.event;
    if (section === 'system' && method === 'ExtrinsicSuccess') success++;
    if (section === 'system' && method === 'ExtrinsicFailed') failed++;
    if (section === 'xorFee' && method === 'FeeWithdrawn' && sameBotAccount(value(data[0]), order.account)) {
      const feeAsset = data.length === 3 ? value(data[1]) : XOR.address;
      if (feeAsset !== order.feeAsset || feeCodec !== undefined) throw new Error('bots.errors.receipt');
      feeCodec = codec(value(data[data.length - 1])).toString();
    }
    if (section === 'liquidityProxy' && method === 'Exchange') {
      if (
        outputCodec !== undefined ||
        !sameBotAccount(value(data[0]), order.account) ||
        value(data[2]) !== order.inputAsset ||
        value(data[3]) !== order.outputAsset ||
        codec(value(data[4])) !== codec(order.inputCodec)
      )
        throw new Error('bots.errors.receipt');
      outputCodec = codec(value(data[5])).toString();
    }
  }
  if (
    !((success === 1 && failed === 0) || (success === 0 && failed === 1)) ||
    feeCodec === undefined ||
    (success === 1 ? outputCodec === undefined : outputCodec !== undefined)
  ) {
    throw new Error('bots.errors.receipt');
  }
  return { success: success === 1, outputCodec: success === 1 ? outputCodec! : '0', actualFeeCodec: feeCodec };
}

/** Hash the exact serialized signed envelope for independent finalized inclusion checks. */
export function botSignedEnvelopeDigest(signedHex: string): string {
  if (!/^0x(?:[0-9a-f]{2})+$/i.test(signedHex) || signedHex.length > 8194)
    throw new Error('bots.errors.receipt');
  return u8aToHex(sha256AsU8a(hexToU8a(signedHex))).slice(2);
}

/** Acquire a browser-wide lifetime lease. Browsers without Web Locks cannot start live sessions. */
async function acquireBrowserLease(key: string): Promise<() => void> {
  if (!globalThis.navigator?.locks?.request) throw new Error('bots.errors.storage');
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request(`polkaswap-bot:${key}`, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(new Error('bots.errors.busy'));
          return;
        }
        await new Promise<void>((release) => resolve(release));
      })
      .catch(() => reject(new Error('bots.errors.storage')));
  });
}

/** Application-only production adapters; constructing them never unlocks or mutates the shared wallet key. */
export function createBotLiveDependencies(storage: BotStorage, agent: PolkaswapAgentApi): BotLiveDependencies {
  return {
    agent,
    now: () => Date.now(),
    market: fetchBotMarketSnapshot,
    campaignMark: readFinalizedDiscoveryCampaignMark,
    acquire: acquireBrowserLease,
    block: async () => (await walletApi.api.rpc.chain.getHeader()).number.toNumber(),
    balances: async (bot) => {
      const bots = (await storage.listBots()).filter((b) => sameBotAccount(b.account, bot.account) && b.network === bot.network);
      const addresses = [...new Set([bot, ...bots].flatMap((b) => Object.keys(b.portfolio.holdings)))];
      const entries = await Promise.all(
        addresses.map(async (address) => {
          const asset = await walletApi.assets.getAccountAsset(address, bot.account);
          const balance = asset.balance?.transferable;
          if (balance === undefined) throw new Error('bots.errors.balance');
          return [address, codec(String(balance)).toString()] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    signer: async (bot, password) => {
      const source = agent.status().wallet.source;
      let pair: KeyringPair | undefined;
      let externalSigner: Signer | undefined;
      let revoked = false;
      if (isInternalSource(source as AppWallet)) {
        const accounts = walletApi.keyring.accounts.subject.getValue();
        const json = Object.values(accounts).find((entry) => sameBotAccount(entry.json.address, bot.account))?.json as
          | KeyringPair$Json
          | undefined;
        if (!json?.encoded || !password) throw new Error('bots.errors.wallet');
        // createFromJson never adds to the global wallet keyring or persists this private pair.
        pair = new Keyring({ ss58Format: SoraPrefix }).createFromJson(JSON.parse(JSON.stringify(json)));
        try {
          pair.decodePkcs8(password);
        } catch {
          pair.lock();
          throw new Error('bots.errors.wallet');
        }
        if (!sameBotAccount(pair.address, bot.account)) {
          pair.lock();
          throw new Error('bots.errors.wallet');
        }
      } else {
        const wallet = await getWallet(source as AppWallet);
        const accounts = await wallet.getAccounts();
        if (!accounts?.some((a) => sameBotAccount(a.address, bot.account)) || !wallet.signer)
          throw new Error('bots.errors.wallet');
        externalSigner = wallet.signer;
      }
      return {
        sign: async (tx) => {
          if (revoked) throw new Error('bots.errors.session');
          if (hasGoalExecutionMarker(bot)) {
            const { signGoalExtrinsic } = await import('./goal-signing');
            if (revoked) throw new Error('bots.errors.session');
            const client = walletApi.api;
            const runtime = client.runtimeVersion;
            const metadata = client.runtimeMetadata;
            const runtimeHex = runtime.toHex();
            const metadataHex = metadata.toHex();
            const genesisHash = client.genesisHash.toHex();
            const nonce = await client.rpc.system.accountNextIndex(bot.account);
            return signGoalExtrinsic({
              transaction: tx,
              account: bot.account,
              nonce,
              pair,
              externalSigner,
              metadataHex,
              genesisHash,
              runtimeVersion: {
                specVersion: runtime.specVersion.toNumber(),
                transactionVersion: runtime.transactionVersion.toNumber(),
              },
              assertCurrent: () => {
                if (
                  revoked ||
                  walletApi.api !== client ||
                  !client.isConnected ||
                  client.runtimeVersion !== runtime ||
                  runtime.toHex() !== runtimeHex ||
                  client.runtimeMetadata !== metadata ||
                  metadata.toHex() !== metadataHex ||
                  client.genesisHash.toHex() !== genesisHash
                )
                  throw new Error('bots.errors.session');
              },
            });
          }
          const nonce = await walletApi.api.rpc.system.accountNextIndex(bot.account);
          if (revoked) throw new Error('bots.errors.session');
          return tx.signAsync(pair ?? bot.account, { nonce, era: 64, signer: externalSigner });
        },
        lock: () => {
          revoked = true;
          pair?.lock();
          pair = undefined;
          externalSigner = undefined;
        },
      };
    },
    build: (prepared) => {
      return buildSwapCall((...args) => walletApi.api.tx.liquidityProxy.swap(...args), prepared.quote);
    },
    receipt: async (order, candidateBlockHash) => {
      if (!order.txHash || order.signedAtBlock === undefined || !order.signedEnvelopeDigest || !order.signedCallHex)
        return null;
      const signedAtBlock = order.signedAtBlock;
      const client = walletApi.api;
      const network = client.genesisHash.toHex();
      if (!client.isConnected || network !== order.network) throw new Error('bots.errors.network');
      let active = true;
      /** Fence late replies before further reads or accounting without claiming to abort an in-flight RPC. */
      const readWhileActive = async <T>(request: () => Promise<T>): Promise<T> => {
        if (!active) throw new Error('bots.errors.pending');
        const result = await request();
        if (!active) throw new Error('bots.errors.pending');
        return result;
      };
      const work = async (): Promise<BotSettlement | null> => {
        const head = await readWhileActive(() => client.rpc.chain.getFinalizedHead());
        const finalized = (await readWhileActive(() => client.rpc.chain.getHeader(head))).number.toNumber();
        const start = candidateBlockHash
          ? (await readWhileActive(() => client.rpc.chain.getHeader(candidateBlockHash))).number.toNumber()
          : Math.max(1, signedAtBlock - 1);
        const last = candidateBlockHash ? start : Math.min(finalized, signedAtBlock + 128);
        if (start > finalized || start < 1) return null;
        for (let height = start; height <= last; height++) {
          if (!client.isConnected || client !== walletApi.api || client.genesisHash.toHex() !== network)
            throw new Error('bots.errors.session');
          const hash = await readWhileActive(() => client.rpc.chain.getBlockHash(height));
          const blockHash = hash.toHex();
          if (candidateBlockHash && blockHash !== candidateBlockHash) throw new Error('bots.errors.receipt');
          const block = await readWhileActive(() => client.rpc.chain.getBlock(hash));
          if (block.block.header.number.toNumber() !== height || block.block.header.hash.toHex() !== blockHash)
            throw new Error('bots.errors.receipt');
          const matches = block.block.extrinsics
            .map((tx, index) => ({ tx, index }))
            .filter(({ tx }) => tx.hash.toHex() === order.txHash);
          if (matches.length > 1) throw new Error('bots.errors.receipt');
          if (!matches.length) continue;
          const { tx, index } = matches[0];
          const signedHex = tx.toHex();
          if (
            !tx.isSigned ||
            !sameBotAccount(tx.signer.toString(), order.account) ||
            tx.method.toHex() !== order.signedCallHex ||
            botSignedEnvelopeDigest(signedHex) !== order.signedEnvelopeDigest ||
            blake2AsHex(hexToU8a(signedHex), 256) !== order.txHash
          )
            throw new Error('bots.errors.receipt');
          const at = await readWhileActive(() => client.at(hash));
          const events = await readWhileActive(() => at.query.system.events());
          const effects = parseBotReceipt(order, Array.from(events), index);
          if (client !== walletApi.api || !client.isConnected || client.genesisHash.toHex() !== network)
            throw new Error('bots.errors.session');
          return {
            ...effects,
            finalized: {
              blockHash,
              blockNumber: height,
              extrinsicIndex: index,
              txHash: order.txHash,
              signedEnvelopeDigest: order.signedEnvelopeDigest,
            },
          };
        }
        // An absent signature is never evidence of a failed transaction, even after its era has passed.
        return null;
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          work(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              active = false;
              reject(new Error('bots.errors.pending'));
            }, 30_000);
          }),
        ]);
      } finally {
        active = false;
        if (timer) clearTimeout(timer);
      }
    },
  };
}

/** Scoped same-wallet execution with durable reservations, pre-broadcast hashes and finalized settlement. */
export function createBotLiveExecutor(
  storage: BotStorage,
  agentApi?: PolkaswapAgentApi,
  overrides: Partial<BotLiveDependencies> = {}
): BotLiveExecutor {
  const deps = { ...createBotLiveDependencies(storage, agentApi ?? createPolkaswapAgentApi()), ...overrides };
  const sessions = new Map<string, PrivateSession>();
  const campaignControl = typeof globalThis.BroadcastChannel === 'function'
    ? new BroadcastChannel('polkaswap-bot-campaign-control-v1') : undefined;
  const generations = new Map<string, number>();
  const leases = new Map<string, () => void>();
  const queues = new Map<string, Promise<unknown>>();
  const keyFor = (bot: Pick<BotDefinition, 'account' | 'network'>) => `${bot.network}:${botAccountKey(bot.account)}`;
  let disposed = false;
  let goalExecutor: GoalLiveExecutor | undefined;
  let goalLoading:
    | Promise<[typeof import('./goal-live'), typeof import('@/features/agent-trading/goal-preparation')]>
    | undefined;
  const goalIds = new Set<string>();
  const goalGenerations = new Map<string, number>();
  const goalManaged = new Set<string>();
  const goalStorage = (): GoalEnabledBotStorage => {
    const goals = Object.getOwnPropertyDescriptor(storage, 'goals');
    if (!goals || !('value' in goals) || !goals.value || typeof goals.value.pause !== 'function')
      throw new Error('bots.errors.storage');
    return storage as GoalEnabledBotStorage;
  };
  const campaignStorage = (): DiscoveryCampaignStorage => {
    if (
      !storage.createCampaign || !storage.listCampaigns || !storage.grantCampaign ||
      !storage.pauseCampaign || !storage.closeCampaign || !storage.recordCampaignMark
    ) throw new Error('bots.errors.storage');
    return storage as DiscoveryCampaignStorage;
  };
  const loadGoal = async (assertCurrent: () => void): Promise<GoalLiveExecutor> => {
    assertCurrent();
    if (goalExecutor) return goalExecutor;
    const config = deps.goal;
    const fields = config && Object.getOwnPropertyDescriptors(config);
    if (
      !fields ||
      !fields.qualification ||
      !('value' in fields.qualification) ||
      typeof fields.qualification.value !== 'function' ||
      Reflect.ownKeys(fields).some((key) => typeof key !== 'string' || !['qualification', 'client'].includes(key)) ||
      (fields.client && (!('value' in fields.client) || typeof fields.client.value !== 'function'))
    )
      return Promise.reject(new Error('bots.errors.research'));
    const goals = goalStorage();
    const qualification = fields.qualification.value as GoalLiveDependencies['qualification'];
    const client = (fields.client?.value ?? (() => walletApi.api)) as GoalLiveDependencies['client'];
    goalLoading ??= Promise.all([import('./goal-live'), import('@/features/agent-trading/goal-preparation')]);
    const [{ createGoalLiveExecutor }, { prepareOwnedGoalSwap }] = await goalLoading;
    assertCurrent();
    goalExecutor ??= createGoalLiveExecutor(goals, {
      qualification,
      client,
      prepare: (request) => prepareOwnedGoalSwap(deps.agent, request),
      signer: deps.signer,
      build: deps.build,
      balances: deps.balances,
      acquire: deps.acquire,
      now: deps.now,
      status: () => deps.agent.status(),
    });
    return goalExecutor;
  };
  const dispatchGoal = async <T>(
    supplied: BotDefinition,
    action: (executor: GoalLiveExecutor, bot: GoalExecutionBot) => Promise<T>,
    ownsSession = false
  ): Promise<T> => {
    if (!deps.goal) assertLegacyGoalRecords(supplied);
    const bot = readGoalExecutionBot(supplied);
    goalIds.add(bot.id);
    const generation = goalGenerations.get(bot.id) ?? 0;
    const assertCurrent = () => {
      if (disposed || generation !== (goalGenerations.get(bot.id) ?? 0)) throw new Error('bots.errors.session');
    };
    const executor = await loadGoal(assertCurrent);
    assertCurrent();
    if (ownsSession) goalManaged.add(bot.id);
    const result = await action(executor, bot);
    assertCurrent();
    return result;
  };
  const pauseUnenteredGoal = async (botId: string): Promise<void> => {
    const raw = (await storage.listBots()).find((bot) => bot.id === botId);
    if (!raw || !hasGoalExecutionMarker(raw)) return;
    const bot = readGoalExecutionBot(raw);
    await goalStorage().goals.pause({
      botId,
      expected: { goalId: bot.goalExecution.goalId, controlRevision: bot.goalControl.revision },
    });
  };
  const exclusive = async <T>(key: string, action: () => Promise<T>): Promise<T> => {
    const previous = queues.get(key) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(action);
    queues.set(key, result);
    try {
      return await result;
    } finally {
      if (queues.get(key) === result) queues.delete(key);
    }
  };
  const stop = (botId: string): void => {
    generations.set(botId, (generations.get(botId) ?? 0) + 1);
    const session = sessions.get(botId);
    if (!session) return;
    clearTimeout(session.timer);
    session.signer.lock();
    sessions.delete(botId);
    const key = keyFor(session);
    if (![...sessions.values()].some((s) => keyFor(s) === key)) {
      leases.get(key)?.();
      leases.delete(key);
    }
  };
  campaignControl?.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !('campaignId' in data) || !('type' in data) ||
        data.type !== 'revoke' || typeof data.campaignId !== 'string' || data.campaignId.length > 80) return;
    for (const session of sessions.values()) if (session.campaignId === data.campaignId) stop(session.botId);
  });
  const guard = async (botId: string): Promise<BotDefinition> => {
    const bot = (await storage.listBots()).find((b) => b.id === botId);
    const session = sessions.get(botId);
    if (!bot || !session || disposed) throw new Error('bots.errors.session');
    assertLegacyGoalRecords(bot);
    assertSession(bot, session, deps.agent.status(), deps.now());
    if (session.identity !== consentIdentity(bot) || session.source !== deps.agent.status().wallet.source) {
      stop(botId);
      throw new Error('bots.errors.session');
    }
    if (bot.discoveryCampaignId) {
      const campaign = (await campaignStorage().listCampaigns()).find((item) => item.id === bot.discoveryCampaignId);
      if (
        !campaign || campaign.status !== 'running' || !campaign.grant ||
        campaign.grant.id !== session.campaignGrantId ||
        campaign.grant.expiresAt !== session.expiresAt ||
        campaign.progress[bot.id]?.outcome !== 'active' ||
        campaign.consent[bot.id] !== consentIdentity(bot)
      ) {
        stop(botId);
        throw new Error('bots.errors.session');
      }
    }
    return bot;
  };
  /** Persist only actual observations; projected costs never become realized loss or a new peak. */
  const checkTradeGoal = async (id: string, fill: PaperFill, candle?: BotCandle): Promise<BotCandle | undefined> => {
    const before = await guard(id);
    if (before.goal?.lossMetric !== 'drawdown') return undefined;
    const observation = candle ?? (await deps.market(deps.agent, before, deps.now()));
    const current = await guard(id);
    const assessment = assessGoalTradeAdmission(current, fill, observation, deps.now());
    if (assessment.goalState && JSON.stringify(assessment.goalState) !== JSON.stringify(current.goalState)) {
      if (!(await storage.saveGoalProgress(id, current.goal!, assessment.goalState)))
        throw new Error('bots.errors.stale');
    }
    if (assessment.rejection) throw new Error(assessment.rejection);
    // Stop, a changed consent, or a higher durable peak may arrive during the IndexedDB write.
    const latest = await guard(id);
    const final = assessGoalTradeAdmission(latest, fill, observation, deps.now());
    if (final.rejection) {
      if (final.rejection === 'bots.errors.goalComplete' && final.goalState)
        await storage.saveGoalProgress(id, latest.goal!, final.goalState);
      throw new Error(final.rejection);
    }
    return observation;
  };
  const reconcile = async (bot: BotDefinition): Promise<void> =>
    exclusive(keyFor(bot), async () => {
      assertLegacyGoalRecords(
        bot,
        (await storage.listBots()).find((item) => item.id === bot.id)
      );
      const temporary = leases.has(keyFor(bot)) ? undefined : await deps.acquire(keyFor(bot));
      try {
        const status = deps.agent.status();
        if (!status.node.connected || status.node.genesisHash !== bot.network) throw new Error('bots.errors.network');
        const orders = (await storage.listOrders(bot.id)).filter(pendingOrder);
        assertLegacyGoalRecords(...orders);
        for (const order of orders) {
          if (order.status === 'reserved' || order.status === 'signed') {
            // The app cannot call send before markSubmitted commits; these reservations were never broadcast.
            await storage.settle(order.id, { success: false, outputCodec: '0', actualFeeCodec: '0', unbroadcast: true });
          } else {
            const receipt = await deps.receipt(order);
            if (receipt) await storage.settle(order.id, receipt);
          }
        }
      } finally {
        temporary?.();
      }
    });
  /** Read transferable balances minus other active bot budgets, without locks, allocation, or a signer. */
  const previewAllocation = async (bot: BotDefinition): Promise<BotFundingPreview> => {
    assertLegacyGoalRecords(bot);
    validatePolicy(bot);
    const status = deps.agent.status();
    if (
      !status.wallet.connected ||
      !sameBotAccount(bot.account, status.wallet.address) ||
      !status.node.connected ||
      bot.network !== status.node.genesisHash
    )
      throw new Error('bots.errors.session');
    const balances = await deps.balances(bot);
    const storedBots = await storage.listBots();
    assertLegacyGoalRecords(storedBots.find((item) => item.id === bot.id));
    const otherBots = storedBots.filter(
      (item) =>
        item.id !== bot.id &&
        item.mode === 'live' &&
        sameBotAccount(item.account, bot.account) &&
        item.network === bot.network &&
        !['idle', 'stopped'].includes(item.status)
    );
    const assets = [bot.assetIn, bot.assetOut, bot.policy.feeAsset]
      .filter((asset, index, all) => all.findIndex((item) => item.address === asset.address) === index)
      .map((asset) => {
        const allocated = otherBots.reduce(
          (sum, item) => sum + codec(item.portfolio.holdings[asset.address] ?? '0'),
          0n
        );
        const available = codec(balances[asset.address] ?? '0') - allocated;
        return {
          asset: { ...asset },
          availableCodec: (available > 0n ? available : 0n).toString(),
          requiredCodec: codec(bot.portfolio.holdings[asset.address] ?? '0').toString(),
        };
      });
    const current = deps.agent.status();
    if (
      !sameBotAccount(current.wallet.address, bot.account) ||
      current.node.genesisHash !== bot.network ||
      !current.wallet.connected ||
      !current.node.connected
    )
      throw new Error('bots.errors.session');
    return { assets, sufficient: assets.every((item) => codec(item.availableCodec) >= codec(item.requiredCodec)) };
  };
  const authorize = async (
    bot: BotDefinition,
    password?: string,
    campaignGrant?: NonNullable<DiscoveryCampaign['grant']>,
    campaignSigner?: SessionSigner,
    endsAt?: number
  ): Promise<void> =>
    exclusive(keyFor(bot), async () => {
      // New-protocol records require their own qualification and exact-ledger executor before wallet access.
      assertLegacyGoalRecords(
        bot,
        (await storage.listBots()).find((item) => item.id === bot.id)
      );
      validatePolicy(bot);
      if (Boolean(bot.discoveryCampaignId) !== Boolean(campaignGrant)) throw new Error('bots.errors.policy');
      if (disposed || bot.mode !== 'live' || bot.policy.feeAsset.address !== XOR.address)
        throw new Error('bots.errors.policy');
      stop(bot.id);
      const generation = generations.get(bot.id);
      const key = keyFor(bot);
      const acquired = !leases.has(key);
      if (acquired) leases.set(key, await deps.acquire(key));
      let signer: SessionSigner | undefined;
      try {
        const source = deps.agent.status().wallet.source;
        const next = JSON.parse(JSON.stringify(bot)) as BotDefinition;
        next.status = 'running';
        const fresh = deps.now() + bot.policy.sessionDurationMs;
        if (endsAt !== undefined && (!Number.isSafeInteger(endsAt) || endsAt <= deps.now()))
          throw new Error('bots.errors.session');
        // A continued run keeps its saved end, never later than a fresh grant would allow.
        next.sessionExpiresAt = campaignGrant?.expiresAt ?? (endsAt === undefined ? fresh : Math.min(endsAt, fresh));
        const sessionBase: BotSession = {
          botId: bot.id,
          account: bot.account,
          network: bot.network,
          expiresAt: next.sessionExpiresAt,
        };
        assertSession(next, sessionBase, deps.agent.status(), deps.now());
        signer = campaignSigner ?? await deps.signer(next, password);
        if (source !== deps.agent.status().wallet.source) throw new Error('bots.errors.session');
        assertSession(next, sessionBase, deps.agent.status(), deps.now());
        if (disposed || generations.get(bot.id) !== generation) throw new Error('bots.errors.session');
        sessions.set(bot.id, {
          ...sessionBase,
          identity: consentIdentity(next),
          source,
          signer,
          ...(campaignGrant ? { campaignGrantId: campaignGrant.id } : {}),
          ...(bot.discoveryCampaignId ? { campaignId: bot.discoveryCampaignId } : {}),
          timer: setTimeout(() => stop(bot.id), Math.max(0, next.sessionExpiresAt - deps.now())),
        });
        const balances = await deps.balances(next);
        if (disposed || generations.get(bot.id) !== generation) throw new Error('bots.errors.session');
        assertSession(next, sessionBase, deps.agent.status(), deps.now());
        await storage.allocate(next, balances);
        if (disposed || generations.get(bot.id) !== generation) throw new Error('bots.errors.session');
      } catch (error) {
        stop(bot.id);
        signer?.lock();
        if (acquired) {
          leases.get(key)?.();
          leases.delete(key);
        }
        throw error;
      }
    });
  const authorizeCampaign = async (campaignId: string, password: string): Promise<void> => {
    if (!password || disposed) throw new Error('bots.errors.wallet');
    const source = deps.agent.status().wallet.source;
    if (!isInternalSource(source as AppWallet)) throw new Error('bots.errors.wallet');
    const managed = campaignStorage();
    const campaign = (await managed.listCampaigns()).find((item) => item.id === campaignId);
    if (!campaign || campaign.status !== 'paused') throw new Error('bots.errors.policy');
    const storedBots = await storage.listBots();
    const selected = campaign.botIds.map((id) => storedBots.find((bot) => bot.id === id));
    if (selected.some((bot) => !bot)) throw new Error('bots.errors.storage');
    const bots = selected as BotDefinition[];
    validateDiscoveryCampaign(campaign, bots);
    if (bots.some((bot) => bot.policy.sessionDurationMs !== 14 * 24 * 60 * 60_000))
      throw new Error('bots.errors.policy');
    for (const bot of bots) await reconcile(bot);
    const grant = (await managed.grantCampaign(campaignId, deps.now())).grant;
    if (!grant) throw new Error('bots.errors.storage');
    let master: SessionSigner | undefined;
    let users = 0;
    const memberSigner = (): SessionSigner => {
      if (!master) throw new Error('bots.errors.session');
      users++;
      let closed = false;
      return {
        sign: (tx) => {
          if (closed || !master) throw new Error('bots.errors.session');
          return master.sign(tx);
        },
        lock: () => {
          if (closed) return;
          closed = true;
          if (--users === 0) {
            master?.lock();
            master = undefined;
          }
        },
      };
    };
    try {
      // Decode the built-in wallet once; each bot receives a revocable view of one grant.
      master = await deps.signer(bots[0], password);
      for (const bot of bots) {
        if (campaign.progress[bot.id].outcome !== 'active') continue;
        await authorize(bot, undefined, grant, memberSigner());
      }
    } catch (error) {
      for (const bot of bots) stop(bot.id);
      master?.lock();
      master = undefined;
      await managed.pauseCampaign(campaignId);
      throw error;
    }
  };
  const stopCampaign = async (campaignId: string): Promise<void> => {
    for (const session of sessions.values()) if (session.campaignId === campaignId) stop(session.botId);
    try { campaignControl?.postMessage({ type: 'revoke', campaignId }); }
    catch { /* Durable pause still fences signing when browser channel delivery fails. */ }
    const managed = campaignStorage();
    const campaign = (await managed.listCampaigns()).find((item) => item.id === campaignId);
    if (!campaign) throw new Error('bots.errors.policy');
    for (const id of campaign.botIds) stop(id);
    await managed.pauseCampaign(campaignId);
  };
  /** Revalue the approved allocation at a fresh finalized head before an order gains authority. */
  const checkCampaignTradeAdmission = async (botId: string, admissionOrderId?: string): Promise<void> => {
    const bot = await guard(botId);
    if (!bot.discoveryCampaignId) return;
    const campaignId = bot.discoveryCampaignId;
    let updated: DiscoveryCampaign;
    try {
      const managed = campaignStorage();
      const campaign = (await managed.listCampaigns()).find((item) => item.id === campaignId);
      if (!campaign || campaign.status !== 'running' || !campaign.grant)
        throw new Error('bots.errors.session');
      const stored = await storage.listBots();
      const members = campaign.botIds.map((id) => stored.find((item) => item.id === id));
      if (members.some((item) => !item)) throw new Error('bots.errors.storage');
      const portfolios = Object.fromEntries((members as BotDefinition[])
        .map((item) => [item.id, item.portfolio]));
      let timer: ReturnType<typeof setTimeout> | undefined;
      let mark: DiscoveryCampaignMark;
      try {
        mark = await Promise.race([
          deps.campaignMark(members as BotDefinition[], deps.now(), false),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('bots.errors.stale')), 25_000);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      const now = deps.now();
      if (!Number.isSafeInteger(now) || !Number.isSafeInteger(mark.timestampMs) ||
          mark.timestampMs < campaign.grant.startedAt || now - mark.timestampMs > 60_000 ||
          mark.timestampMs > now + 30_000)
        throw new Error('bots.errors.stale');
      updated = await managed.recordCampaignMark(campaignId, mark, portfolios, admissionOrderId);
    } catch (error) {
      // No trusted mark means no permission to sign; revoke the shared grant durably.
      await stopCampaign(campaignId).catch(() => stop(botId));
      throw error;
    }
    if (updated.status !== 'running' || updated.progress[botId]?.outcome !== 'active') {
      stop(botId);
      throw new Error('bots.errors.goalComplete');
    }
    await guard(botId);
  };
  const execute = async (supplied: BotDefinition, proposal: TradeProposal): Promise<void> =>
    exclusive(keyFor(sessions.get(supplied.id) ?? supplied), async () => {
      assertLegacyGoalRecords(supplied);
      let order: BotOrder | undefined;
      let broadcastAttempted = false;
      let reserved = false;
      try {
        const bot = await guard(supplied.id);
        const { input, output, inputCodec } = proposalInput(bot, proposal);
        const request = {
          assetIn: { address: input.address },
          assetOut: { address: output.address },
          amount: proposal.amount,
          side: 'input' as const,
          slippageTolerance: bot.policy.slippagePercent,
        };
        const prepared = await deps.agent.prepareSwap(request);
        await assertPrepared(bot, proposal, prepared, deps.agent.status(), deps.now());
        const tx = deps.build(prepared);
        if (tx.method.section !== 'liquidityProxy' || tx.method.method !== 'swap')
          throw new Error('bots.errors.intent');
        const callHex = tx.method.toHex();
        const payment = await tx.paymentInfo(bot.account);
        const estimatedFee = codec(payment.partialFee.toString());
        const ceiling = prepared.envelope.feeCeilings.find((f) => f.assetAddress === bot.policy.feeAsset.address);
        if (!ceiling || estimatedFee > codec(ceiling.amountCodec)) throw new Error('bots.errors.feeBudget');
        const reserveFee = codec(ceiling.amountCodec);
        order = {
          id: crypto.randomUUID(),
          botId: bot.id,
          account: bot.account,
          network: bot.network,
          intentId: prepared.intentId,
          status: 'reserved',
          inputAsset: input.address,
          inputCodec,
          outputAsset: output.address,
          minOutputCodec: prepared.quote.minMaxCodec,
          feeAsset: bot.policy.feeAsset.address,
          feeCodec: reserveFee.toString(),
          createdAt: deps.now(),
        };
        const projectedFill: PaperFill = {
          inputAsset: order.inputAsset,
          inputCodec: order.inputCodec,
          outputAsset: order.outputAsset,
          outputCodec: order.minOutputCodec,
          feeAsset: order.feeAsset,
          feeCodec: order.feeCodec,
        };
        const beforeSigning = await checkTradeGoal(bot.id, projectedFill);
        await checkCampaignTradeAdmission(bot.id);
        assertPreparedContext(bot, prepared, deps.agent.status(), deps.now());
        await storage.reserve(order, await deps.balances(bot));
        reserved = true;
        assertTradeFunds(await guard(bot.id), input.address, inputCodec, order.feeCodec);
        await assertPrepared(bot, proposal, prepared, deps.agent.status(), deps.now());
        order.signedAtBlock = await deps.block();
        await checkTradeGoal(bot.id, projectedFill, beforeSigning);
        assertPreparedContext(bot, prepared, deps.agent.status(), deps.now());
        const signer = sessions.get(bot.id)?.signer;
        if (!signer) throw new Error('bots.errors.session');
        const signed = await signer.sign(tx);
        if (
          signed.method.toHex() !== callHex ||
          !signed.isSigned ||
          !signed.era.isMortalEra ||
          signed.era.asMortalEra.period.toNumber() > 64 ||
          !sameBotAccount(signed.signer.toString(), bot.account)
        ) {
          throw new Error('bots.errors.intent');
        }
        order.txHash = signed.hash.toHex();
        order.signedEnvelopeDigest = botSignedEnvelopeDigest(signed.toHex());
        order.signedCallHex = callHex;
        await storage.markSigned(order.id, order.txHash, order.signedAtBlock, order.signedEnvelopeDigest, callHex);
        // External signers may change the encoded envelope size. Persist its hash first,
        // then price the actual signed bytes before an order can reach broadcast.
        const signedPayment = await signed.paymentInfo(bot.account);
        const signedFee = codec(signedPayment.partialFee.toString());
        const afterSigning = await guard(bot.id);
        assertPreparedContext(afterSigning, prepared, deps.agent.status(), deps.now());
        if (signedFee === 0n || signedFee > codec(order.feeCodec)) throw new Error('bots.errors.feeBudget');
        assertTradeFunds(afterSigning, input.address, inputCodec, signedFee.toString());
        // External-wallet prompts may take time: fresh quote and chain context are mandatory after signing too.
        const quote = await deps.agent.quoteSwap(request);
        assertQuote(bot, proposal, quote);
        if (codec(quote.minMaxCodec) < codec(order.minOutputCodec)) throw new Error('bots.errors.policy');
        await assertPrepared(bot, proposal, prepared, deps.agent.status(), deps.now());
        const balances = await deps.balances(bot);
        assertAllocations(
          (await storage.listBots()).filter((b) => sameBotAccount(b.account, bot.account) && b.network === bot.network),
          balances
        );
        // Retain the signed minimum, even when the refreshed executable quote improves.
        const beforeBroadcast = await checkTradeGoal(bot.id, projectedFill);
        await checkCampaignTradeAdmission(bot.id, order.id);
        assertTradeFunds(await guard(bot.id), input.address, inputCodec, order.feeCodec);
        await checkTradeGoal(bot.id, projectedFill, beforeBroadcast);
        assertPreparedContext(bot, prepared, deps.agent.status(), deps.now());
        const activeSigner = sessions.get(bot.id)?.signer;
        if (activeSigner !== signer) throw new Error('bots.errors.session');
        await storage.markSubmitted(order.id);
        // Tab pause, balance changes or a higher durable goal peak may arrive during this write.
        // The storage instance can undo this submitted state only until send is called.
        assertTradeFunds(await guard(bot.id), input.address, inputCodec, order.feeCodec);
        await checkTradeGoal(bot.id, projectedFill, beforeBroadcast);
        if (sessions.get(bot.id)?.signer !== activeSigner || deps.now() >= bot.sessionExpiresAt)
          throw new Error('bots.errors.session');
        assertPreparedContext(bot, prepared, deps.agent.status(), deps.now());
        storage.markBroadcastAttempted?.(order.id);
        broadcastAttempted = true;
        const sentOrder = order;
        await new Promise<void>((resolve, reject) => {
          let unsubscribe: (() => void) | undefined;
          let finished = false;
          const timer = setTimeout(() => finish(new Error('bots.errors.pending')), 90_000);
          const finish = (error?: unknown): void => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            unsubscribe?.();
            if (error) reject(error);
            else resolve();
          };
          void signed
            .send((result) => {
              if (finished || !result.status.isFinalized) return;
              const candidate = result.status.asFinalized?.toHex();
              if (!candidate || !/^0x[0-9a-f]{64}$/i.test(candidate)) {
                finish(new Error('bots.errors.pending'));
                return;
              }
              // The callback is a hint. Only a separate canonical finalized read can settle the ledger.
              void deps.receipt(sentOrder, candidate).then(
                (receipt) => receipt ? storage.settle(sentOrder.id, receipt).then(() => finish(), finish) : finish(new Error('bots.errors.pending')),
                finish
              );
            })
            .then((unsub) => {
              unsubscribe = unsub;
              if (finished) unsub();
            }, finish);
        });
      } catch (error) {
        stop(supplied.id);
        if (order && reserved && !broadcastAttempted) {
          const persisted = (await storage.listOrders(supplied.id)).find((item) => item.id === order!.id);
          if (persisted?.status === 'submitted') {
            // Only this un-reloaded storage instance can hold a ticket, and only before send starts.
            if (storage.cancelUnbroadcastSubmitted)
              await storage.cancelUnbroadcastSubmitted(order.id).catch(() => undefined);
          } else if (persisted)
            await storage.settle(order.id, { success: false, outputCodec: '0', actualFeeCodec: '0', unbroadcast: true });
        }
        const latest = (await storage.listBots()).find((b) => b.id === supplied.id);
        if (latest) {
          assertLegacyGoalRecords(latest);
          if (!['paused', 'stopped'].includes(latest.status)) latest.status = 'attention';
          await storage.saveBot(latest);
        }
        throw error;
      }
    });
  // Account/network changes and tab disposal revoke memory-only signing material independently of UI polling.
  const watchdog = setInterval(() => {
    for (const session of sessions.values()) {
      const status = deps.agent.status();
      if (
        !status.wallet.connected ||
        !status.node.connected ||
        status.wallet.address !== session.account ||
        status.wallet.source !== session.source ||
        status.node.genesisHash !== session.network ||
        deps.now() >= session.expiresAt
      ) {
        stop(session.botId);
      }
    }
  }, 1000);
  const dispose = (): void => {
    disposed = true;
    clearInterval(watchdog);
    for (const id of [...generations.keys()]) stop(id);
    campaignControl?.close();
    globalThis.removeEventListener?.('pagehide', revokeAll);
  };
  function revokeAll(): void {
    for (const id of [...generations.keys()]) stop(id);
  }
  globalThis.addEventListener?.('pagehide', revokeAll);
  const stopDispatched = (botId: string): void | Promise<void> => {
    goalGenerations.set(botId, (goalGenerations.get(botId) ?? 0) + 1);
    // Keep revocation synchronous even if the durable pause below must await storage or lazy setup.
    stop(botId);
    if (goalIds.has(botId)) {
      if (goalExecutor) {
        goalManaged.add(botId);
        return goalExecutor.stop(botId);
      }
      return pauseUnenteredGoal(botId);
    }
    if (deps.goal) return pauseUnenteredGoal(botId);
  };
  const revokeGoalDispatches = () => {
    for (const id of goalIds) {
      goalGenerations.set(id, (goalGenerations.get(id) ?? 0) + 1);
      if (!goalManaged.has(id)) void pauseUnenteredGoal(id).catch(() => undefined);
    }
  };
  globalThis.addEventListener?.('pagehide', revokeGoalDispatches);
  return {
    previewAllocation: (bot) =>
      hasGoalExecutionMarker(bot)
        ? dispatchGoal(bot, (executor, valid) => executor.previewAllocation(valid))
        : previewAllocation(bot),
    authorize: (bot, password, options) =>
      hasGoalExecutionMarker(bot)
        ? dispatchGoal(bot, (executor, valid) => executor.authorize(valid, password), true)
        : authorize(bot, password, undefined, undefined, options?.endsAt),
    authorizeCampaign,
    stopCampaign,
    execute: async (bot, proposal) => {
      if (!hasGoalExecutionMarker(bot)) return execute(bot, proposal);
      const snapshot = copyGoalStorageData(proposal);
      return dispatchGoal(bot, (executor, valid) => executor.execute(valid, snapshot));
    },
    reconcile: (bot, candidateBlockHash) =>
      hasGoalExecutionMarker(bot)
        ? dispatchGoal(bot, (executor, valid) => executor.reconcile(valid, candidateBlockHash))
        : reconcile(bot),
    stop: stopDispatched,
    dispose: () => {
      if (disposed) return;
      // Mark disposed first; a late import cannot construct an executor or unlock a signer.
      disposed = true;
      revokeGoalDispatches();
      globalThis.removeEventListener?.('pagehide', revokeGoalDispatches);
      try {
        goalExecutor?.dispose();
      } finally {
        dispose();
      }
    },
  };
}
