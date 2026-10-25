/** Explicit local allocation approval for the qualified exact goal. No signer or transfer API is accepted. */
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import type { AgentStatus } from '@/features/agent-trading/types';
import { GOAL_SWAP_EXECUTION_PROTOCOL } from '@/features/agent-trading/goal-swap';
import {
  createGoalExactLedger,
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from './goal-exact-ledger';
import { GOAL_EXECUTION_PROTOCOL, type GoalExecutionBot } from './goal-execution-types';
import { goalMarkFromExecutionContext } from './goal-policy';
import {
  assertGoalQualificationVerification,
  assertGoalQualificationRuntime,
  goalQualificationDigest,
  readGoalQualificationBinding,
  type GoalQualificationVerification,
} from './goal-qualification';
import { assertGoalAccountClear, copyGoalStorageData, readGoalExecutionBot } from './goal-storage';
import { assertAllocations, pendingOrder } from './policy';
import type { GoalEnabledBotStorage } from './storage';
import type { GoalReceiptClient } from './goal-receipt';
import type { BotDefinition, BotAsset } from './types';

export interface GoalFundingRequest {
  /** Retain this ID for retries/reloads; a different ID explicitly requests another allocation. */
  draftId: string;
  /** Wallet identity reviewed by the user, before approval. */
  account: string;
  source: string;
  qualification: GoalQualificationVerification;
}
export interface GoalFundingDependencies {
  client(): GoalReceiptClient;
  status(): AgentStatus;
  /** Trusted application adapter: actual transferable codec balances, including all existing allocation assets. */
  balances(bot: BotDefinition): Promise<Record<string, string>>;
  /** Same account/network lease namespace used by the live executor. */
  acquire(key: string): Promise<() => void>;
  now(): number;
}
export type GoalFundingPreview =
  | { kind: 'funded'; draftId: string; bot: GoalExecutionBot }
  | {
      kind: 'preview';
      draftId: string;
      botId: string;
      goalId: string;
      account: string;
      source: string;
      qualificationDigest: string;
      policyDigest: string;
      initialKusdCodec: string;
      feeReserveCodec: string;
      maxTradeKusdCodec: string;
      maxTradeXorCodec: string;
      assets: Array<{ asset: BotAsset; requiredCodec: string; availableCodec: string }>;
      sufficient: boolean;
    };
// Fixed mainnet address format, matching sdk/apiAccount.ts without importing wallet/signing modules.
const SORA_SS58_PREFIX = 69;
const MAX = (1n << 128n) - 1n;
const fail = (key = 'policy'): never => {
  throw Error(`bots.errors.${key}`);
};
function check(value: unknown, key?: string): asserts value {
  if (!value) fail(key);
}
const amount = (value: unknown): bigint => {
  check(typeof value === 'string' && /^(?:0|[1-9]\d{0,38})$/.test(value), 'balance');
  const n = BigInt(value);
  check(n <= MAX, 'balance');
  return n;
};
/** Snapshot own data without invoking accessors; keep the original private qualification capability. */
function request(raw: GoalFundingRequest): GoalFundingRequest {
  check(raw && Object.getPrototypeOf(raw) === Object.prototype);
  const own = Object.getOwnPropertyDescriptors(raw),
    keys = ['draftId', 'account', 'source', 'qualification'];
  check(Reflect.ownKeys(own).length === keys.length && keys.every((k) => own[k]?.enumerable && 'value' in own[k]));
  const r = Object.fromEntries(keys.map((k) => [k, own[k].value])) as unknown as GoalFundingRequest;
  check(typeof r.draftId === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(r.draftId));
  check(typeof r.account === 'string' && r.account.length > 0 && r.account.length <= 128, 'wallet');
  check(encodeAddress(decodeAddress(r.account), SORA_SS58_PREFIX) === r.account, 'wallet');
  check(typeof r.source === 'string' && r.source.length > 0 && r.source.length <= 128, 'wallet');
  // Ownership is checked before any certificate/binding field is used or any external read starts.
  const profiles = Object.getOwnPropertyDescriptor(r.qualification ?? {}, 'runtimeProfiles');
  check(profiles && 'value' in profiles, 'research');
  const detached = copyGoalStorageData(profiles.value) as GoalQualificationVerification['runtimeProfiles'];
  check(Array.isArray(detached) && detached.length > 0, 'research');
  assertGoalQualificationRuntime(r.qualification, detached[0]);
  return r;
}

/**
 * Preview never writes. approve() is the explicit user-consent boundary and only allocates locally:
 * initialize owns the original funded timestamp and returns a PAUSED goal with no trading session.
 * Stable draft IDs, an account lease, and storage's atomic uniqueness prevent duplicate epochs.
 */
export function createGoalFundingService(storage: GoalEnabledBotStorage, deps: GoalFundingDependencies) {
  const queues = new Map<string, Promise<unknown>>();
  const perform = async (r: GoalFundingRequest, approve: boolean): Promise<GoalFundingPreview> => {
    const q = r.qualification,
      binding = readGoalQualificationBinding(q.binding);
    check(binding.genesisHash === GOAL_EXACT_POLICY.genesisHash);
    const id = `goal-funding:${goalQualificationDigest({ protocol: 'goal-funding-id-v1', draftId: r.draftId })}`,
      goalId = `${id}:epoch`;
    const execution = { protocol: GOAL_SWAP_EXECUTION_PROTOCOL, expectedDenominator: binding.denominator };
    const consentDigest = goalQualificationDigest({
      protocol: 'explicit-goal-funding-v1',
      draftId: r.draftId,
      account: r.account,
      source: r.source,
      binding,
      qualificationDigest: q.certificateSha256,
      policyDigest: q.policySha256,
      feeReserveCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
    });
    const goalExecution = {
      protocol: GOAL_EXECUTION_PROTOCOL,
      execution,
      goalId,
      consentDigest,
      qualificationDigest: q.certificateSha256,
      policyDigest: q.policySha256,
    };
    const client = deps.client();
    let finished = false;
    const current = () => {
      const status = deps.status();
      return (
        !finished &&
        deps.client() === client &&
        client.isConnected &&
        client.genesisHash.toHex() === binding.genesisHash &&
        status.node.connected &&
        status.node.genesisHash === binding.genesisHash &&
        status.wallet.connected &&
        status.wallet.address === r.account &&
        status.wallet.source === r.source
      );
    };
    check(current(), 'session');
    const reads = createGoalExecutionSession({ client, isCurrent: current, now: deps.now });
    let release: (() => void) | undefined;
    let expired!: (error: Error) => void;
    const expiry = new Promise<never>((_resolve, reject) => {
      expired = reject;
    });
    const timer = setTimeout(() => {
      finished = true;
      try {
        reads.dispose();
      } catch {
        /* Scope revocation still completes. */
      }
      expired(Error('bots.errors.stale'));
    }, 30000);
    const wait = <T>(work: Promise<T>): Promise<T> => Promise.race([work, expiry]);
    const matching = (raw: BotDefinition): GoalExecutionBot => {
      const existing = readGoalExecutionBot(raw);
      check(
        existing.account === r.account &&
          existing.network === binding.genesisHash &&
          goalQualificationDigest(existing.goalExecution) === goalQualificationDigest(goalExecution)
      );
      assertGoalQualificationVerification(q, existing);
      return existing;
    };
    try {
      if (approve) {
        const acquiring = deps.acquire(`${binding.genesisHash}:${r.account}`);
        void acquiring
          .then((remove) => {
            if (finished) remove();
            else release = remove;
          })
          .catch(() => undefined);
        await wait(acquiring);
        check(current(), 'session');
      }
      const existing = (await wait(storage.listBots())).find((bot) => bot.id === id);
      check(current(), 'session');
      if (existing) return { kind: 'funded', draftId: r.draftId, bot: matching(existing) };
      const context = await wait(reads.capture({ expectedDenominator: binding.denominator }));
      reads.assertCurrent(context);
      const { specVersion, transactionVersion } = context.codecBinding.runtimeVersion;
      check((specVersion === 130 || specVersion === 131) && (transactionVersion === 130 || transactionVersion === 131));
      assertGoalQualificationRuntime(q, {
        specVersion,
        transactionVersion,
        metadataSha256: context.codecBinding.metadataSha256,
        codeHash: context.codeHash,
      });
      const openingMark = goalMarkFromExecutionContext(context),
        createdAt = deps.now();
      const config = {
        goalId,
        initialKusdCodec: binding.initialKusdCodec,
        maxTradeKusdCodec: binding.maxTradeKusdCodec,
        maxTradeXorCodec: binding.maxTradeXorCodec,
      };
      const exactGoalState = createGoalExactLedger({ ...config, startedAtMs: createdAt }, openingMark);
      const holdings = { [KUSD]: binding.initialKusdCodec, [XOR]: GOAL_EXACT_POLICY.initialFeeReserveCodec };
      const bot: BotDefinition & { goalExecution: typeof goalExecution } = {
        version: 1,
        id,
        name: 'KUSD / XOR',
        mode: 'live',
        status: 'paused',
        account: r.account,
        network: binding.genesisHash,
        assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
        assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
        strategy: copyGoalStorageData(binding.strategy),
        policy: {
          maxTradeCodec: { [KUSD]: binding.maxTradeKusdCodec, [XOR]: binding.maxTradeXorCodec },
          slippagePercent: '0.5',
          maxPriceImpactPercent: '1',
          feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 },
          feeBudgetCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
          sessionDurationMs: GOAL_EXACT_POLICY.durationMs,
        },
        portfolio: { initial: { ...holdings }, holdings: { ...holdings }, feesPaidCodec: '0', trades: 0 },
        state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
        provider: 'custom',
        model: '',
        endpoint: '',
        createdAt,
        sessionExpiresAt: 0,
        activity: [],
        equity: [],
        apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
        goal: {
          title: 'KUSD / XOR',
          targetReturnPercent: '5',
          maxLossPercent: '5',
          durationMs: GOAL_EXACT_POLICY.durationMs,
          valuationAsset: 'output',
          lossMetric: 'drawdown',
        },
        goalExecution,
      };
      const projection = readGoalExecutionBot({
        ...bot,
        exactGoalState,
        goalControl: { revision: 0 },
        goalSignal: { completedAtMs: null },
      });
      const guard = () => {
        check(current(), 'session');
        reads.assertCurrent(context);
        assertGoalQualificationVerification(q, projection);
      };
      guard();
      const balances = copyGoalStorageData(await wait(deps.balances(bot)));
      guard();
      for (const value of Object.values(balances)) amount(value);
      const bots = await wait(storage.listBots());
      guard();
      const orders = await wait(storage.listOrders());
      guard();
      // A different SS58 representation must never split the same account's reservation total.
      const alias = (account: string) => {
        try {
          return encodeAddress(decodeAddress(account), SORA_SS58_PREFIX) === r.account;
        } catch {
          return false;
        }
      };
      check(
        !bots.some((b) => b.network === binding.genesisHash && b.account !== r.account && alias(b.account)),
        'wallet'
      );
      check(
        !orders.some((o) => o.network === binding.genesisHash && o.account !== r.account && alias(o.account)),
        'wallet'
      );
      const raced = bots.find((b) => b.id === id);
      if (raced) return { kind: 'funded', draftId: r.draftId, bot: matching(raced) };
      const ledger = { bots, orders };
      assertGoalAccountClear(ledger, r.account, binding.genesisHash);
      check(
        !orders.some((o) => o.account === r.account && o.network === binding.genesisHash && pendingOrder(o)),
        'pending'
      );
      const others = bots.filter((b) => b.account === r.account && b.network === binding.genesisHash);
      const assets = [bot.assetIn, bot.assetOut].map((asset) => {
        const used = others
          .filter((b) => b.mode === 'live' && !['idle', 'stopped'].includes(b.status))
          .reduce((sum, b) => sum + amount(b.portfolio.holdings[asset.address] ?? '0'), 0n);
        const available = amount(balances[asset.address] ?? '0') - used;
        return {
          asset,
          requiredCodec: holdings[asset.address],
          availableCodec: String(available > 0n ? available : 0n),
        };
      });
      if (!approve) {
        // Existing over-allocation is an error; insufficient new budget is a read-only preview result.
        assertAllocations(others, balances);
        return {
          kind: 'preview',
          draftId: r.draftId,
          botId: id,
          goalId,
          account: r.account,
          source: r.source,
          qualificationDigest: q.certificateSha256,
          policyDigest: q.policySha256,
          initialKusdCodec: binding.initialKusdCodec,
          feeReserveCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
          maxTradeKusdCodec: binding.maxTradeKusdCodec,
          maxTradeXorCodec: binding.maxTradeXorCodec,
          assets,
          sufficient: assets.every((a) => amount(a.availableCodec) >= amount(a.requiredCodec)),
        };
      }
      assertAllocations([...others, bot], balances);
      guard();
      try {
        const funded = await wait(
          storage.goals.initialize({ bot, config, openingMark, balances, assertCurrent: guard })
        );
        return { kind: 'funded', draftId: r.draftId, bot: funded };
      } catch (error) {
        // Another tab may win after our read. Atomic storage uniqueness never creates a second epoch.
        const winner = (await wait(storage.listBots())).find((b) => b.id === id);
        check(current(), 'session');
        if (winner) return { kind: 'funded', draftId: r.draftId, bot: matching(winner) };
        throw error;
      }
    } finally {
      finished = true;
      clearTimeout(timer);
      // Cleanup cannot mask a committed allocation or prevent the other cleanup attempt.
      try {
        reads.dispose();
      } catch {
        /* Already locally revoked. */
      }
      try {
        release?.();
      } catch {
        /* The lease adapter owns any external cleanup failure. */
      }
    }
  };
  return Object.freeze({
    /** Read-only live preview; it cannot create a funding epoch or reserve an allocation. */
    preview: (input: GoalFundingRequest): Promise<GoalFundingPreview> => perform(request(input), false),
    /** Explicit user approval only. Returns the existing matching epoch unchanged on retry. */
    approve: async (input: GoalFundingRequest): Promise<GoalExecutionBot> => {
      const r = request(input),
        key = `${r.account}:${r.draftId}`;
      const prior = queues.get(key) ?? Promise.resolve();
      const work = prior.catch(() => undefined).then(() => perform(r, true));
      queues.set(key, work);
      try {
        const result = await work;
        check(result.kind === 'funded');
        return result.bot;
      } finally {
        if (queues.get(key) === work) queues.delete(key);
      }
    },
  });
}
