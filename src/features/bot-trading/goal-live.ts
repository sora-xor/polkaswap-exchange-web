/** Explicit goal execution. Authority stays private; signed or uncertain transactions are never settled by invention. */
import { blake2AsHex, decodeAddress } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { createAgentDigest } from '@/features/agent-trading/intent';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import { projectGoalSwapEstimate } from '@/features/agent-trading/goal-swap';
import type { AgentPreparedSwap, AgentStatus, AgentSwapRequest } from '@/features/agent-trading/types';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { assertAllocations, assertPreparedContext as assertReviewDeadline, pendingOrder } from './policy';
import { toCodec } from './amounts';
import { botAccountKey, sameBotAccount } from './account-identity';
import { assessGoalExactFill } from './goal-exact-ledger';
import type { GoalExactFill } from './goal-exact-ledger';
import type { ExecutionStateContext } from './execution-state';
import { readGoalExecutionBot, copyGoalStorageData } from './goal-storage';
import {
  assertGoalQualificationVerification,
  assertGoalQualificationRuntime,
  assertGoalQualificationFee,
  type GoalQualificationVerification,
} from './goal-qualification';
import {
  assertGoalCallHex,
  assertGoalPrepared,
  assertGoalPreparedContext,
  assertGoalQuote,
  goalConsentIdentity,
  goalMarkFromExecutionContext,
} from './goal-policy';
import { goalSignedEnvelopeDigest, readGoalFinalizedReceipt, type GoalReceiptClient } from './goal-receipt';
import { discoverGoalFinalizedReceipt } from './goal-recovery';
import { discoverGoalExpiry, discardGoalExpiryEvidence } from './goal-expiry';
import { exportGoalPersistedSigning } from './goal-mortality';
import type { GoalExecutionBot, GoalExecutionOrder } from './goal-execution-types';
import type { GoalEnabledBotStorage } from './storage';
import type { BotAsset, TradeProposal } from './types';

type Extrinsic = SubmittableExtrinsic<'promise'>;
export interface GoalLiveSigner {
  sign(tx: Extrinsic): Promise<Extrinsic>;
  lock(): void;
}
/** The context must be the original object owned by this session, not its public evidence projection. */
export interface GoalOwnedPreparation {
  prepared: AgentPreparedSwap;
  context: ExecutionStateContext;
  session: ReturnType<typeof createGoalExecutionSession>;
  assertCurrent(): void;
  dispose(): void;
}
export interface GoalLiveDependencies {
  prepare(request: AgentSwapRequest): Promise<GoalOwnedPreparation>;
  qualification(bot: GoalExecutionBot): GoalQualificationVerification;
  signer(bot: GoalExecutionBot, password?: string): Promise<GoalLiveSigner>;
  build(prepared: AgentPreparedSwap): Extrinsic;
  balances(bot: GoalExecutionBot): Promise<Record<string, string>>;
  status(): AgentStatus;
  client(): GoalReceiptClient;
  /** Exclusive account/network lifetime lease, using the same namespace as legacy bots. */
  acquire(key: string): Promise<() => void>;
  now(): number;
}
export interface GoalFundingPreview {
  sufficient: boolean;
  assets: Array<{ asset: BotAsset; availableCodec: string; requiredCodec: string }>;
}
export interface GoalLiveExecutor {
  previewAllocation(bot: GoalExecutionBot): Promise<GoalFundingPreview>;
  /** Call only after explicit user approval; this does not recreate a funded epoch. */
  authorize(bot: GoalExecutionBot, password?: string): Promise<void>;
  execute(bot: GoalExecutionBot, proposal: TradeProposal): Promise<void>;
  /** Recover retained receipts or discover recent finalized inclusion. Absence is never inferred. */
  reconcile(bot: GoalExecutionBot, candidateBlockHash?: string): Promise<void>;
  /** Memory revocation is synchronous; the returned promise records durable pause. */
  stop(botId: string): Promise<void>;
  dispose(): void;
}
interface PrivateSession {
  bot: GoalExecutionBot;
  identity: string;
  generation: number;
  source: string;
  client: GoalReceiptClient;
  runtime: GoalReceiptClient['runtimeVersion'];
  runtimeHex: string;
  metadata: object;
  qualification: GoalQualificationVerification;
  signer: GoalLiveSigner;
  release(): void;
  connectionChanged(): void;
  preparations: Set<GoalOwnedPreparation>;
  timer: ReturnType<typeof setTimeout>;
}
const fail = (message = 'bots.errors.session'): never => {
  throw new Error(message);
};
function check(value: unknown, message?: string): asserts value {
  if (!value) fail(message);
}
const keyFor = (bot: GoalExecutionBot) => `${bot.network}:${botAccountKey(bot.account)}`;
const accounting = (bot: GoalExecutionBot) => ({
  goalId: bot.goalExecution.goalId,
  revision: bot.exactGoalState.revision,
  stateSha256: bot.exactGoalState.stateSha256,
});
const expected = (bot: GoalExecutionBot) => ({ ...accounting(bot), controlRevision: bot.goalControl.revision });
const control = (bot: GoalExecutionBot) => ({
  goalId: bot.goalExecution.goalId,
  controlRevision: bot.goalControl.revision,
});
const sameAccount = (left: string, right: string) => u8aToHex(decodeAddress(left)) === u8aToHex(decodeAddress(right));
/** Cleanup failures cannot prevent attempts to release the remaining owned resources. */
const cleanup = (...actions: Array<() => void>): unknown[] => {
  const errors: unknown[] = [];
  for (const action of actions) {
    try {
      action();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
};
const qualificationRuntime = (qualification: GoalQualificationVerification, context: ExecutionStateContext) => {
  const { specVersion, transactionVersion } = context.codecBinding.runtimeVersion;
  check(
    (specVersion === 130 || specVersion === 131) && (transactionVersion === 130 || transactionVersion === 131),
    'bots.errors.policy'
  );
  assertGoalQualificationRuntime(qualification, {
    specVersion,
    transactionVersion,
    metadataSha256: context.codecBinding.metadataSha256,
    codeHash: context.codeHash,
  });
};
const fillFor = (order: GoalExecutionOrder): GoalExactFill => ({
  inputAsset: order.inputAsset,
  inputCodec: order.inputCodec,
  outputAsset: order.outputAsset,
  minimumOutputCodec: order.minOutputCodec,
  feeCeilingCodec: order.feeCodec,
});

/** Compose qualified consent, owned finalized reads, exact storage and a caller-provided signer. */
export function createGoalLiveExecutor(storage: GoalEnabledBotStorage, deps: GoalLiveDependencies): GoalLiveExecutor {
  const sessions = new Map<string, PrivateSession>();
  const generations = new Map<string, number>();
  const queues = new Map<string, Promise<unknown>>();
  let disposed = false;
  const time = () => {
    const n = deps.now();
    check(Number.isSafeInteger(n) && n >= 0, 'bots.errors.stale');
    return n;
  };
  const get = async (id: string) => {
    const bot = (await storage.listBots()).find((b) => b.id === id);
    check(bot, 'bots.errors.storage');
    return readGoalExecutionBot(bot);
  };
  const exclusive = async <T>(key: string, work: () => Promise<T>): Promise<T> => {
    const prior = queues.get(key) ?? Promise.resolve();
    const result = prior.catch(() => undefined).then(work);
    queues.set(key, result);
    try {
      return await result;
    } finally {
      if (queues.get(key) === result) queues.delete(key);
    }
  };
  const revoke = (id: string) => {
    generations.set(id, (generations.get(id) ?? 0) + 1);
    const session = sessions.get(id);
    sessions.delete(id);
    if (!session) return [];
    clearTimeout(session.timer);
    const preparations = [...session.preparations];
    session.preparations.clear();
    return cleanup(
      ...preparations.map((preparation) => () => preparation.dispose()),
      () => session.signer.lock(),
      () => session.client.off('connected', session.connectionChanged),
      () => session.client.off('disconnected', session.connectionChanged),
      () => session.release()
    );
  };
  const pause = async (id: string) => {
    const bot = await get(id);
    await storage.goals.pause({ botId: id, expected: control(bot) });
  };
  const stop = (id: string): Promise<void> => {
    const errors = revoke(id);
    return pause(id).then(() => {
      if (errors.length) throw errors[0];
    });
  };
  const publicContext = (bot: GoalExecutionBot) => {
    const status = deps.status();
    check(
      status.node.connected &&
        status.wallet.connected &&
        status.node.genesisHash === bot.network &&
        status.wallet.address === bot.account
    );
    return status;
  };
  const guard = (session: PrivateSession, bot = session.bot) => {
    check(!disposed && sessions.get(bot.id) === session && generations.get(bot.id) === session.generation);
    const status = publicContext(bot);
    check(
      status.wallet.source === session.source &&
        deps.client() === session.client &&
        session.client.isConnected &&
        session.client.genesisHash.toHex() === bot.network &&
        session.client.runtimeVersion === session.runtime &&
        session.runtime.toHex() === session.runtimeHex &&
        session.client.runtimeMetadata === session.metadata
    );
    check(
      goalConsentIdentity(bot) === session.identity &&
        bot.goalControl.revision === session.bot.goalControl.revision &&
        bot.status === 'running' &&
        time() < bot.sessionExpiresAt &&
        time() < bot.exactGoalState.episode.endedAtMs &&
        bot.exactGoalState.outcome === 'active' &&
        !bot.exactGoalState.attention.length
    );
    assertGoalQualificationVerification(session.qualification, bot);
  };
  const current = async (session: PrivateSession) => {
    guard(session);
    const bot = await get(session.bot.id);
    guard(session, bot);
    return bot;
  };
  const readSession = (bot: GoalExecutionBot) => {
    const client = deps.client();
    return createGoalExecutionSession({
      client,
      now: time,
      isCurrent: () =>
        deps.client() === client &&
        client.genesisHash.toHex() === bot.network &&
        deps.status().node.connected &&
        deps.status().node.genesisHash === bot.network,
    });
  };
  const accountBalances = async (session: PrivateSession, bot: GoalExecutionBot) => {
    const balances = await deps.balances(bot);
    guard(session, bot);
    const bots = await storage.listBots();
    guard(session, bot);
    assertAllocations(
      bots.filter((b) => sameBotAccount(b.account, bot.account) && b.network === bot.network),
      balances
    );
    return balances;
  };
  const authorize = async (supplied: GoalExecutionBot, password?: string) => {
    // Invalidate a queued/in-flight authorization immediately, not when its queue callback starts.
    const input = readGoalExecutionBot(supplied);
    revoke(input.id);
    const generation = generations.get(input.id)!;
    return exclusive(keyFor(input), async () => {
      let release: (() => void) | undefined;
      let signer: GoalLiveSigner | undefined;
      let installed = false;
      let resumed = false;
      let cleanupConnection: () => void = () => undefined;
      const alive = () => check(!disposed && generations.get(input.id) === generation);
      try {
        alive();
        let bot = await get(input.id);
        alive();
        check(
          goalConsentIdentity(bot) === goalConsentIdentity(input) &&
            bot.goalControl.revision === input.goalControl.revision,
          'bots.errors.stale'
        );
        const qualification = deps.qualification(bot);
        assertGoalQualificationVerification(qualification, bot);
        const source = publicContext(bot).wallet.source;
        check(typeof source === 'string' && source.length > 0);
        const client = deps.client(),
          runtime = client.runtimeVersion,
          runtimeHex = runtime.toHex(),
          metadata = client.runtimeMetadata;
        const connectionChanged = () => {
          void stop(input.id).catch(() => undefined);
        };
        const attached = new Set<'connected' | 'disconnected'>();
        cleanupConnection = () => {
          cleanup(...[...attached].map((event) => () => client.off(event, connectionChanged)));
        };
        for (const event of ['connected', 'disconnected'] as const) {
          attached.add(event);
          client.on(event, connectionChanged);
        }
        const unchanged = () => {
          alive();
          assertGoalQualificationVerification(qualification, bot);
          check(
            deps.client() === client &&
              client.isConnected &&
              client.genesisHash.toHex() === bot.network &&
              client.runtimeVersion === runtime &&
              runtime.toHex() === runtimeHex &&
              client.runtimeMetadata === metadata &&
              publicContext(bot).wallet.source === source
          );
        };
        release = await deps.acquire(keyFor(bot));
        unchanged();
        const inspection = createGoalExecutionSession({
          client,
          now: time,
          isCurrent: () => {
            unchanged();
            return true;
          },
        });
        try {
          const context = await inspection.capture({
            expectedDenominator: bot.goalExecution.execution.expectedDenominator,
          });
          unchanged();
          inspection.assertCurrent(context);
          qualificationRuntime(qualification, context);
        } finally {
          inspection.dispose();
        }
        let balances = await deps.balances(bot);
        unchanged();
        const bots = await storage.listBots();
        unchanged();
        assertAllocations(
          bots.filter((b) => sameBotAccount(b.account, bot.account) && b.network === bot.network),
          balances
        );
        check(
          !(await storage.listOrders()).some(
            (o) => sameBotAccount(o.account, bot.account) && o.network === bot.network && pendingOrder(o)
          ),
          'bots.errors.pending'
        );
        unchanged();
        signer = await deps.signer(bot, password);
        unchanged();
        balances = await deps.balances(bot);
        unchanged();
        const next = await storage.goals.resume({
          botId: bot.id,
          expected: expected(bot),
          sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
          balances,
          assertCurrent: unchanged,
        });
        resumed = true;
        bot = next;
        unchanged();
        const session: PrivateSession = {
          bot,
          identity: goalConsentIdentity(bot),
          generation,
          source,
          client,
          runtime,
          runtimeHex,
          metadata,
          qualification,
          signer,
          release,
          connectionChanged,
          preparations: new Set(),
          timer: setTimeout(
            () => {
              void stop(bot.id).catch(() => undefined);
            },
            Math.max(0, bot.sessionExpiresAt - time())
          ),
        };
        sessions.set(bot.id, session);
        installed = true;
        guard(session, bot);
      } catch (error) {
        if (installed) revoke(input.id);
        else {
          cleanup(
            cleanupConnection,
            () => signer?.lock(),
            () => release?.()
          );
        }
        if (resumed) {
          try {
            await pause(input.id);
          } catch {
            /* Preserve the original authorization failure. */
          }
        }
        throw error;
      }
    });
  };
  const applyRetained = async (order: GoalExecutionOrder) => {
    const bot = await get(order.botId);
    // Keep real receipt evidence pending for original-deadline accounting after expiry.
    if (time() >= bot.exactGoalState.episode.endedAtMs) return stop(bot.id);
    const session = readSession(bot);
    try {
      const context = await session.capture({ expectedDenominator: bot.goalExecution.execution.expectedDenominator });
      if (time() >= bot.exactGoalState.episode.endedAtMs) return stop(bot.id);
      const result = await storage.goals.applyReceipt({
        botId: bot.id,
        orderId: order.id,
        expected: accounting(bot),
        accountingAtMs: time(),
        mark: goalMarkFromExecutionContext(context),
        assertCurrent: () => session.assertCurrent(context),
      });
      const active = sessions.get(bot.id);
      if (active) {
        try {
          guard(active, result.bot);
          // Finalized receipt accounting cannot prove that unrelated wallet activity left
          // the separately allocated fee reserve and input capital transferable.
          await accountBalances(active, result.bot);
        } catch {
          // A replacement authorization rechecks its own balances. Never revoke it
          // because an older receipt's asynchronous read finished late.
          if (sessions.get(bot.id) === active) await stop(bot.id);
        }
      }
      return result;
    } finally {
      session.dispose();
    }
  };
  const receive = async (order: GoalExecutionOrder, candidate: string) => {
    const client = deps.client();
    const receipt = await readGoalFinalizedReceipt({
      client,
      isCurrent: () =>
        deps.client() === client &&
        client.genesisHash.toHex() === order.network &&
        deps.status().node.connected &&
        deps.status().node.genesisHash === order.network,
      now: time,
      order,
      blockHash: candidate,
    });
    const retained = await storage.goals.persistFinalReceipt({ orderId: order.id, receipt });
    await applyRetained(retained);
  };
  const send = (signed: Extrinsic, order: GoalExecutionOrder) =>
    new Promise<void>((resolve, reject) => {
      let unsubscribe: (() => void) | undefined,
        finished = false,
        receiving = false;
      const finish = (error?: unknown) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup(() => unsubscribe?.());
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(() => finish(new Error('bots.errors.pending')), 90_000);
      try {
        void signed
          .send((result) => {
            if (finished || receiving || !result.status.isFinalized) return;
            receiving = true;
            void receive(order, result.status.asFinalized.toHex()).then(() => finish(), finish);
          })
          .then((unsub) => {
            unsubscribe = unsub;
            if (finished) cleanup(unsub);
          }, finish);
      } catch (error) {
        finish(error);
      }
    });
  const execute = async (supplied: GoalExecutionBot, proposed: TradeProposal) => {
    const input = readGoalExecutionBot(supplied);
    const proposal = copyGoalStorageData(proposed);
    return exclusive(keyFor(sessions.get(input.id)?.bot ?? input), async () => {
      let owned: GoalOwnedPreparation | undefined, order: GoalExecutionOrder | undefined;
      let signingStarted = false;
      const session = sessions.get(input.id);
      check(session);
      try {
        let bot = await current(session);
        const assetIn = proposal.action === 'buy' ? bot.assetIn : bot.assetOut;
        const assetOut = proposal.action === 'buy' ? bot.assetOut : bot.assetIn;
        check(proposal.action === 'buy' || proposal.action === 'sell', 'bots.errors.proposal');
        const amountInCodec = toCodec(proposal.amount, 18);
        owned = await deps.prepare({
          assetIn: { address: assetIn.address },
          assetOut: { address: assetOut.address },
          amount: proposal.amount,
          side: 'input',
          dexId: 0,
          liquiditySource: LiquiditySourceTypes.XYKPool,
          slippageTolerance: '0.5',
          execution: bot.goalExecution.execution,
        });
        session.preparations.add(owned);
        guard(session, bot);
        owned.assertCurrent();
        owned.session.assertCurrent(owned.context);
        qualificationRuntime(session.qualification, owned.context);
        const prepared = owned.prepared;
        const proof = await assertGoalPrepared(bot, proposal, prepared, deps.status(), time());
        guard(session, bot);
        assertGoalQualificationFee(session.qualification, proof.fill.feeCeilingCodec);
        owned.assertCurrent();
        const tx = deps.build(prepared);
        assertGoalCallHex(prepared, tx.method.toHex());
        check(tx.method.section === 'liquidityProxy' && tx.method.method === 'swap', 'bots.errors.intent');
        const balances = await accountBalances(session, bot);
        bot = await current(session);
        owned.assertCurrent();
        const reserved = await storage.goals.reserve({
          botId: bot.id,
          expected: expected(bot),
          accountingAtMs: time(),
          mark: proof.mark,
          balances,
          order: {
            id: crypto.randomUUID(),
            botId: bot.id,
            account: bot.account,
            network: bot.network,
            intentId: prepared.intentId,
            status: 'reserved',
            inputAsset: assetIn.address,
            inputCodec: amountInCodec,
            outputAsset: assetOut.address,
            minOutputCodec: proof.fill.minimumOutputCodec,
            feeAsset: bot.policy.feeAsset.address,
            feeCodec: proof.fill.feeCeilingCodec,
            createdAt: time(),
            goalExecution: {
              ...bot.goalExecution,
              ledgerRevision: bot.exactGoalState.revision,
              ledgerStateSha256: bot.exactGoalState.stateSha256,
              controlRevision: bot.goalControl.revision,
              quoteDigest: prepared.quote.quoteDigest,
              envelopeDigest: proof.envelopeDigest,
              feePolicyDigest: prepared.quote.execution!.estimate.fee.policySha256,
              orderRevision: 0,
              phase: 'reserved',
            },
          },
          assertCurrent: () => {
            guard(session, bot);
            owned!.assertCurrent();
          },
        });
        check(reserved.order && !reserved.rejection, 'bots.errors.policy');
        order = reserved.order;
        bot = await current(session);
        owned.assertCurrent();
        assertGoalPreparedContext(bot, prepared, deps.status(), time());
        const signedAtBlock = deps.status().node.blockNumber;
        check(
          Number.isSafeInteger(signedAtBlock) && signedAtBlock > 0 && signedAtBlock <= 0xffffffff,
          'bots.errors.intent'
        );
        signingStarted = true;
        const signed = await session.signer.sign(tx);
        // A returned signature is a durable fact even if Stop, a runtime change or expiry won the await.
        const envelopeHex = signed.toHex();
        const signedEnvelopeDigest = goalSignedEnvelopeDigest(envelopeHex);
        const txHash = blake2AsHex(hexToU8a(envelopeHex), 256);
        const signingEvidence = exportGoalPersistedSigning(signed);
        order = await storage.goals.sign({
          orderId: order.id,
          expectedOrderRevision: order.goalExecution.orderRevision,
          txHash,
          signedAtBlock,
          envelopeDigest: proof.envelopeDigest,
          signedEnvelopeDigest,
          ...(signingEvidence ? { signingEvidence } : {}),
        });
        bot = await current(session);
        assertReviewDeadline(bot, prepared, deps.status(), time());
        assertGoalCallHex(prepared, signed.method.toHex());
        check(
          signed.isSigned &&
            signed.era.isMortalEra &&
            signed.era.asMortalEra.period.toNumber() === 64 &&
            sameAccount(signed.signer.toString(), bot.account) &&
            signed.hash.toHex() === txHash,
          'bots.errors.intent'
        );
        const context = await owned.session.capture({
          expectedDenominator: bot.goalExecution.execution.expectedDenominator,
        });
        guard(session, bot);
        qualificationRuntime(session.qualification, context);
        const request = { assetIn: order.inputAsset, assetOut: order.outputAsset, amountInCodec: order.inputCodec };
        const estimate = await owned.session.quote(context, request);
        check(estimate.status === 'available', 'bots.errors.policy');
        guard(session, bot);
        const projected = projectGoalSwapEstimate({
          execution: bot.goalExecution.execution,
          estimate,
          assetIn: prepared.quote.assetIn,
          assetOut: prepared.quote.assetOut,
          resolved: {
            assetIn: {
              address: prepared.quote.assetIn.address,
              name: prepared.quote.assetIn.name,
              symbol: prepared.quote.assetIn.symbol,
              decimals: 18,
              isMintable: false,
            },
            assetOut: {
              address: prepared.quote.assetOut.address,
              name: prepared.quote.assetOut.name,
              symbol: prepared.quote.assetOut.symbol,
              decimals: 18,
              isMintable: false,
            },
            amount: proposal.amount,
            side: 'input',
            isExchangeB: false,
            slippageTolerance: '0.5',
            liquiditySource: LiquiditySourceTypes.XYKPool,
            dexId: 0,
            quoteTimeoutMs: 5000,
          },
        });
        const freshQuote = { ...projected.quote, quoteDigest: await createAgentDigest('swap.quote', projected.quote) };
        const freshProof = assertGoalQuote(bot, proposal, freshQuote);
        assertGoalQualificationFee(session.qualification, freshProof.fill.feeCeilingCodec);
        check(BigInt(freshQuote.minMaxCodec) >= BigInt(order.minOutputCodec), 'bots.errors.policy');
        const fee = await owned.session.estimateEnvelopeFee(context, {
          ...request,
          quotedAmountOutCodec: prepared.quote.raw.amount,
          envelopeHex,
        });
        guard(session, bot);
        owned.session.assertCurrent(context);
        assertGoalQualificationFee(session.qualification, fee.fee.amountCodec);
        check(BigInt(fee.fee.amountCodec) <= BigInt(order.feeCodec), 'bots.errors.feeBudget');
        await accountBalances(session, bot);
        bot = await current(session);
        const mark = goalMarkFromExecutionContext(context);
        bot = await storage.goals.observe({
          botId: bot.id,
          expected: expected(bot),
          accountingAtMs: time(),
          mark,
          assertCurrent: () => {
            guard(session);
            owned!.session.assertCurrent(context);
          },
        });
        guard(session, bot);
        const admission = assessGoalExactFill(bot.exactGoalState, {
          expectedRevision: bot.exactGoalState.revision,
          accountingAtMs: bot.exactGoalState.accountingAtMs,
          mark,
          fill: fillFor(order),
        });
        check(!admission.rejection, 'bots.errors.policy');
        const beforeSend = () => {
          guard(session, bot);
          owned!.session.assertCurrent(context);
          assertReviewDeadline(bot, prepared, deps.status(), time());
          check(signed.toHex() === envelopeHex && signed.method.toHex() === proof.callHex, 'bots.errors.intent');
        };
        beforeSend();
        order = await storage.goals.submit({
          orderId: order.id,
          expected: expected(bot),
          expectedOrderRevision: order.goalExecution.orderRevision,
          txHash,
          assertCurrent: beforeSend,
        });
        beforeSend();
        await send(signed, order);
      } catch (error) {
        revoke(input.id);
        if (order && !signingStarted) {
          try {
            await storage.goals.cancel({ orderId: order.id, expectedOrderRevision: order.goalExecution.orderRevision });
          } catch {
            /* A failed cancellation remains pending; pause still must be attempted. */
          }
        }
        try {
          await pause(input.id);
        } catch {
          /* Local authority is already revoked; preserve the original failure. */
        }
        throw error;
      } finally {
        if (owned) {
          session.preparations.delete(owned);
          cleanup(() => owned!.dispose());
        }
      }
    });
  };
  const reconcile = async (supplied: GoalExecutionBot, candidate?: string) => {
    const bot = readGoalExecutionBot(supplied);
    return exclusive(keyFor(bot), async () => {
      const active = sessions.get(bot.id);
      const release = active ? undefined : await deps.acquire(keyFor(bot));
      try {
        const orders = (await storage.listOrders(bot.id)).filter(pendingOrder) as GoalExecutionOrder[];
        for (const order of orders) {
          if (order.goalExecution.phase === 'finalized-pending') await applyRetained(order);
          else if (['signed', 'submitted'].includes(order.goalExecution.phase)) {
            if (candidate) await receive(order, candidate);
            else {
              const client = deps.client();
              const fresh = readGoalExecutionBot((await storage.listBots()).find((value) => value.id === bot.id));
              const options = {
                client,
                isCurrent: () =>
                  deps.client() === client &&
                  client.genesisHash.toHex() === order.network &&
                  deps.status().node.connected &&
                  deps.status().node.genesisHash === order.network,
                now: time,
                order,
              };
              const result = order.signingEvidence
                ? await discoverGoalExpiry({ ...options, controlRevision: fresh.goalControl.revision })
                : await discoverGoalFinalizedReceipt(options);
              if (result.status === 'included') {
                const retained = await storage.goals.persistFinalReceipt({
                  orderId: order.id,
                  receipt: result.receipt,
                });
                await applyRetained(retained);
              } else if (result.status === 'expired') {
                try {
                  await storage.goals.expire({
                    orderId: order.id,
                    expected: { goalId: fresh.goalExecution.goalId, controlRevision: fresh.goalControl.revision },
                    evidence: result.evidence,
                  });
                } finally {
                  discardGoalExpiryEvidence(result.evidence);
                }
              }
            }
          }
        }
      } finally {
        release?.();
      }
    });
  };
  const previewAllocation = async (supplied: GoalExecutionBot): Promise<GoalFundingPreview> => {
    const bot = readGoalExecutionBot(supplied);
    publicContext(bot);
    const balances = await deps.balances(bot);
    const others = (await storage.listBots()).filter(
      (b) =>
        b.id !== bot.id &&
        sameBotAccount(b.account, bot.account) &&
        b.network === bot.network &&
        b.mode === 'live' &&
        !['idle', 'stopped'].includes(b.status)
    );
    publicContext(bot);
    const assets = [bot.assetIn, bot.assetOut].map((asset) => {
      const available =
        BigInt(balances[asset.address] ?? '0') -
        others.reduce((sum, b) => sum + BigInt(b.portfolio.holdings[asset.address] ?? '0'), 0n);
      return {
        asset,
        availableCodec: (available > 0n ? available : 0n).toString(),
        requiredCodec: bot.portfolio.holdings[asset.address],
      };
    });
    return { assets, sufficient: assets.every((a) => BigInt(a.availableCodec) >= BigInt(a.requiredCodec)) };
  };
  const revokeAll = () => {
    for (const id of new Set([...generations.keys(), ...sessions.keys()])) {
      revoke(id);
      void pause(id).catch(() => undefined);
    }
  };
  const watchdog = setInterval(() => {
    for (const session of sessions.values()) {
      try {
        guard(session);
      } catch {
        void stop(session.bot.id).catch(() => undefined);
      }
    }
  }, 1000);
  globalThis.addEventListener?.('pagehide', revokeAll);
  return {
    authorize,
    execute,
    reconcile,
    previewAllocation,
    stop,
    dispose: () => {
      disposed = true;
      clearInterval(watchdog);
      revokeAll();
      globalThis.removeEventListener?.('pagehide', revokeAll);
    },
  };
}
