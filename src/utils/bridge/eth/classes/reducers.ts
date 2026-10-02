import first from 'lodash/fp/first';

import * as POLKASWAP_TYPES from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type {
  IBridgeReducerOptions,
  GetBridgeHistoryInstance,
  SignExternal,
  EvmSubmissionEvidence,
} from '@/utils/bridge/common/types';
import {
  getTransactionEvents,
  getEvmTransactionFee,
  getEvmTransactionReceiptByHash,
  onEvmTransactionPending,
} from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { waitForApprovedRequest, waitForIncomingRequest } from '@/utils/bridge/eth/utils';

import { TransactionStatus, type IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { TransactionResponse } from 'ethers';

const SORA_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS = 2_000;
const EVM_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS = 2_000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

/** Reads only complete, safe persisted EVM submission fingerprints. */
const getEvmSubmissionEvidence = (transaction: EthHistory): EvmSubmissionEvidence | null => {
  const payload = isRecord(transaction.payload) ? transaction.payload : null;
  const evidence = payload && isRecord(payload.evmSubmission) ? payload.evmSubmission : null;

  if (!evidence) return null;

  const { from, to, nonce, data, value, startTimestamp } = evidence;
  const hasStrings = [from, to, data, value].every((item) => typeof item === 'string' && item.length > 0);

  if (
    !hasStrings ||
    !Number.isSafeInteger(nonce) ||
    Number(nonce) < 0 ||
    !Number.isSafeInteger(startTimestamp) ||
    Number(startTimestamp) <= 0
  ) {
    return null;
  }

  try {
    if (BigInt(value as string) < 0n) return null;
  } catch {
    return null;
  }

  return evidence as EvmSubmissionEvidence;
};

const isSameEvmSubmissionEvidence = (left: EvmSubmissionEvidence, right: EvmSubmissionEvidence): boolean => {
  return (
    left.from === right.from &&
    left.to === right.to &&
    left.nonce === right.nonce &&
    left.data === right.data &&
    left.value === right.value &&
    left.startTimestamp === right.startTimestamp
  );
};

const getEvmErrorCode = (error: unknown): unknown => {
  return isRecord(error) ? error.code : undefined;
};

/**
 * Errors that prove the prepared request was not accepted for broadcast.
 * Nonce conflicts are intentionally excluded: they can indicate that a
 * same-nonce transaction is already pending or mined, so its fingerprint must
 * remain available for read-only recovery.
 */
const isDefinitelyUnbroadcastEvmError = (error: unknown): boolean => {
  const code = getEvmErrorCode(error);

  return [
    'ACTION_REJECTED',
    4001,
    'INSUFFICIENT_FUNDS',
    'UNPREDICTABLE_GAS_LIMIT',
    'UNSUPPORTED_OPERATION',
    'INVALID_ARGUMENT',
  ].includes(code as never);
};

const createBridgeTrackingAbortError = (): Error => {
  const error = new Error('Bridge transaction tracking canceled');
  error.name = 'AbortError';
  return error;
};

const throwIfBridgeTrackingAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw createBridgeTrackingAbortError();
};

/** Resolves an operation early when bridge tracking is canceled. */
const raceWithBridgeTrackingAbort = async <T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> => {
  throwIfBridgeTrackingAborted(signal);

  if (!signal) return await operation;

  return await new Promise<T>((resolve, reject) => {
    let settled = false;

    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      callback();
    };
    const handleAbort = (): void => settle(() => reject(createBridgeTrackingAbortError()));

    signal.addEventListener('abort', handleAbort, { once: true });
    operation.then(
      (value) => settle(() => resolve(value)),
      (error) => settle(() => reject(error))
    );

    if (signal.aborted) handleAbort();
  });
};

/** Abortable polling delay used while recovering submitted SORA metadata. */
const waitForBridgeTrackingDelay = async (delayMs: number, signal?: AbortSignal): Promise<void> => {
  throwIfBridgeTrackingAborted(signal);

  if (!signal) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => settle(resolve), delayMs);

    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', handleAbort);
      callback();
    };
    const handleAbort = (): void => settle(() => reject(createBridgeTrackingAbortError()));

    signal.addEventListener('abort', handleAbort, { once: true });
    if (signal.aborted) handleAbort();
  });
};

type EthBridgeReducerOptions<T extends IBridgeTransaction> = IBridgeReducerOptions<T> & {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
};

export class EthBridgeReducer extends BridgeReducer<EthHistory> {
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance<EthBridgeHistory>;
  protected readonly signExternalOutgoing!: SignExternal;
  protected readonly signExternalIncoming!: SignExternal;

  constructor(options: EthBridgeReducerOptions<EthHistory>) {
    super(options);

    this.getBridgeHistoryInstance = options.getBridgeHistoryInstance;
    this.signExternalOutgoing = options.signExternalOutgoing;
    this.signExternalIncoming = options.signExternalIncoming;
  }

  /** Finds an already-submitted EVM bridge transaction for the SORA request before prompting to sign again. */
  private async findSubmittedEvmTxBySoraHash(id: string): Promise<TransactionResponse | null> {
    const { to, hash, startTime } = this.getTransaction(id);

    if (!(to && hash)) {
      return null;
    }

    const bridgeHistory = await this.getBridgeHistoryInstance();

    return await bridgeHistory.findEthTxBySoraHash(to, hash, startTime);
  }

  /** Returns true when a restored EVM transaction is known to have failed on-chain. */
  private async isFailedSubmittedEvmTx(transaction: TransactionResponse): Promise<boolean> {
    const isError = (transaction as { isError?: unknown }).isError;

    if (isError !== undefined && Number(isError) !== 0) {
      return true;
    }

    const receipt = await getEvmTransactionReceiptByHash(transaction.hash);

    return receipt?.status === 0;
  }

  private async restoreSubmittedEvmTx(id: string, signal?: AbortSignal): Promise<boolean> {
    const transaction = await raceWithBridgeTrackingAbort(this.findSubmittedEvmTxBySoraHash(id), signal);

    if (!transaction) {
      return false;
    }

    if (await raceWithBridgeTrackingAbort(this.isFailedSubmittedEvmTx(transaction), signal)) {
      return false;
    }

    throwIfBridgeTrackingAborted(signal);
    this.updateTransactionParams(id, { externalHash: transaction.hash });

    return true;
  }

  /**
   * Retries transient explorer failures, then exposes Retry while preserving
   * the SORA request. Failed reads never authorize a new Ethereum signature.
   */
  private async safelyRestoreSubmittedEvmTx(id: string, signal?: AbortSignal): Promise<boolean> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.restoreSubmittedEvmTx(id, signal);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        if (attempt >= 2) throw error;
        console.info('[Bridge]: Ethereum transaction restoration is temporarily unavailable', error);
        await waitForBridgeTrackingDelay(EVM_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS, signal);
      }
    }
  }

  /** Removes a prepared-submission fingerprint after a definitive result. */
  private updateEvmSubmissionEvidence(id: string, evidence?: EvmSubmissionEvidence): void {
    const transaction = this.getTransaction(id);
    const payload = isRecord(transaction.payload) ? transaction.payload : {};
    const { evmSubmission: _previousEvidence, ...rest } = payload;
    const nextPayload = evidence ? { ...rest, evmSubmission: evidence } : rest;

    this.updateTransactionParams(id, { payload: nextPayload } as Partial<EthHistory>);
  }

  /**
   * Stores a wallet response even if its UI tracker was canceled after the
   * broadcast. This is durable payment evidence, not a stale status update.
   */
  private persistSignedEvmTransaction(id: string, signedTx: TransactionResponse): void {
    try {
      const transaction = this.getTransaction(id);

      if (!transaction || (transaction.externalHash && transaction.externalHash !== signedTx.hash)) return;

      const payload = isRecord(transaction.payload) ? transaction.payload : {};
      const { evmSubmission: _previousEvidence, ...nextPayload } = payload;

      this.updateTransaction(id, {
        externalHash: signedTx.hash,
        externalNetworkFee: getEvmTransactionFee(signedTx),
        payload: nextPayload,
      } as Partial<EthHistory>);
      this.updateHistory();
    } catch {
      // A force-removed history row must not be recreated by a late provider callback.
    }
  }

  /**
   * Clears a late definitive wallet rejection after tracking was canceled, but
   * only when no replacement run has written newer submission evidence.
   */
  private clearMatchingEvmSubmissionEvidence(id: string, expected: EvmSubmissionEvidence): void {
    try {
      const transaction = this.getTransaction(id);
      const current = transaction ? getEvmSubmissionEvidence(transaction) : null;

      if (transaction?.externalHash || !current || !isSameEvmSubmissionEvidence(current, expected)) return;

      const payload = isRecord(transaction.payload) ? transaction.payload : {};
      const { evmSubmission: _previousEvidence, ...nextPayload } = payload;

      this.updateTransaction(id, { payload: nextPayload } as Partial<EthHistory>);
      this.updateHistory();
    } catch {
      // A removed history row or a newer account lifecycle owns the state now.
    }
  }

  /** Polls fresh explorer data until a prepared wallet submission is found. */
  private async waitForSubmittedEvmTxByEvidence(
    id: string,
    initialEvidence: EvmSubmissionEvidence,
    signal?: AbortSignal
  ): Promise<boolean> {
    let evidence = initialEvidence;

    while (true) {
      throwIfBridgeTrackingAborted(signal);

      const currentTransaction = this.getTransaction(id);

      if (currentTransaction.externalHash) return true;

      const currentEvidence = getEvmSubmissionEvidence(currentTransaction);

      // A late definitive rejection from the canceled wallet prompt removed
      // the fingerprint, so this replacement tracker may proceed to consent.
      if (!currentEvidence) return false;

      // If another lifecycle wrote newer evidence, follow that submission and
      // never fall through to a duplicate signature.
      if (!isSameEvmSubmissionEvidence(currentEvidence, evidence)) {
        evidence = currentEvidence;
      }

      try {
        const bridgeHistory = await raceWithBridgeTrackingAbort(this.getBridgeHistoryInstance(), signal);
        const transaction = await raceWithBridgeTrackingAbort(
          bridgeHistory.findEthTxBySubmissionFingerprint(evidence),
          signal
        );

        if (transaction) {
          if (await raceWithBridgeTrackingAbort(this.isFailedSubmittedEvmTx(transaction), signal)) {
            this.updateEvmSubmissionEvidence(id);
            return false;
          }

          throwIfBridgeTrackingAborted(signal);
          this.updateTransactionParams(id, {
            externalHash: transaction.hash,
            externalNetworkFee: getEvmTransactionFee(transaction),
          });
          this.updateEvmSubmissionEvidence(id);
          return true;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        console.info('[Bridge]: Waiting for the prepared Ethereum transaction to become discoverable', error);
      }

      const updatedTransaction = this.getTransaction(id);

      if (updatedTransaction.externalHash) return true;

      const updatedEvidence = getEvmSubmissionEvidence(updatedTransaction);

      if (!updatedEvidence) return false;

      if (!isSameEvmSubmissionEvidence(updatedEvidence, evidence)) {
        evidence = updatedEvidence;
        continue;
      }

      await waitForBridgeTrackingDelay(EVM_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS, signal);
    }
  }

  async onEvmPending(id: string, signal?: AbortSignal): Promise<void> {
    await raceWithBridgeTrackingAbort(
      onEvmTransactionPending(id, this.getTransaction.bind(this), (transactionId, params) => {
        throwIfBridgeTrackingAborted(signal);
        this.updateTransactionParams(transactionId, params);
      }),
      signal
    );
    throwIfBridgeTrackingAborted(signal);
  }

  async onEvmSubmitted(id: string, signExternal: SignExternal, signal?: AbortSignal): Promise<void> {
    throwIfBridgeTrackingAborted(signal);
    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      const wasAlreadyInProgress = this.isTransactionInProgress(id);
      const persistedEvidence = getEvmSubmissionEvidence(this.getTransaction(id));

      // Read-only recovery is safe to run in the background and must not
      // require the transaction page to remain active.
      this.addTransactionToProgress(id);

      if (persistedEvidence) {
        const restored = await this.waitForSubmittedEvmTxByEvidence(id, persistedEvidence, signal);

        if (restored) return;
      }

      if (!wasAlreadyInProgress && (await this.safelyRestoreSubmittedEvmTx(id, signal))) {
        return;
      }

      // Only a genuinely new wallet signature requires active-page consent.
      this.beforeSubmit(id);

      try {
        throwIfBridgeTrackingAborted(signal);
        let recordedEvidence: EvmSubmissionEvidence | null = null;
        const signing = signExternal(id, (evidence) => {
          throwIfBridgeTrackingAborted(signal);
          recordedEvidence = evidence;
          this.updateEvmSubmissionEvidence(id, evidence);
        }).then(
          (signedTx) => {
            this.persistSignedEvmTransaction(id, signedTx);
            return signedTx;
          },
          (error) => {
            if (recordedEvidence && isDefinitelyUnbroadcastEvmError(error)) {
              this.clearMatchingEvmSubmissionEvidence(id, recordedEvidence);
            }
            throw error;
          }
        );
        await raceWithBridgeTrackingAbort(signing, signal);
      } catch (error: any) {
        if (error instanceof Error && error.name === 'AbortError') throw error;

        if (isDefinitelyUnbroadcastEvmError(error)) {
          this.updateEvmSubmissionEvidence(id);
          throw error;
        }

        const evidence = getEvmSubmissionEvidence(this.getTransaction(id));

        if (evidence && (await this.waitForSubmittedEvmTxByEvidence(id, evidence, signal))) {
          return;
        }

        // Without prepared evidence, the provider failed before the wallet
        // could broadcast, so the state machine can safely expose the error.
        if (!evidence) {
          throw error;
        }
      }
    }
  }

  private async restoreOutgoingTransactionBlock(id: string, signal?: AbortSignal): Promise<boolean> {
    throwIfBridgeTrackingAborted(signal);
    const { blockId, blockHeight, from, hash, txId } = this.getTransaction(id);

    if (blockId && txId) {
      return true;
    }

    const soraTxId = txId || hash;

    if (!(from && soraTxId)) {
      return false;
    }

    const bridgeHistory = await raceWithBridgeTrackingAbort(this.getBridgeHistoryInstance(), signal);
    const historyItem = first(
      await raceWithBridgeTrackingAbort(bridgeHistory.fetchHistoryElements(from as string, 0, [soraTxId]), signal)
    );

    if (!historyItem?.blockHash) {
      return false;
    }

    const requestHash = (historyItem.data as POLKASWAP_TYPES.HistoryElementEthBridgeOutgoing)?.requestHash;

    throwIfBridgeTrackingAborted(signal);
    this.updateTransactionParams(id, {
      txId: soraTxId,
      blockId: historyItem.blockHash,
      blockHeight: blockHeight ?? Number(historyItem.blockHeight),
      ...(requestHash ? { hash: requestHash } : {}),
    });

    return true;
  }

  private async restoreOutgoingRequestHash(id: string, signal?: AbortSignal): Promise<void> {
    await this.restoreOutgoingTransactionBlock(id, signal);
    throwIfBridgeTrackingAborted(signal);

    const restoredTx = this.getTransaction(id);

    if (restoredTx.hash) {
      const requestStatus = await raceWithBridgeTrackingAbort(ethBridgeApi.getRequestStatus(restoredTx.hash), signal);

      if (requestStatus != null) {
        return;
      }
    }

    const { blockId, txId } = restoredTx;

    if (!(blockId && txId)) {
      throw new Error(`[Bridge]: Unable to restore ETH bridge request hash because SORA block data is unavailable`);
    }

    const transactionEvents = await raceWithBridgeTrackingAbort(
      getTransactionEvents(blockId, txId, ethBridgeApi.api),
      signal
    );
    const requestEvent = transactionEvents.find((e) => ethBridgeApi.api.events.ethBridge.RequestRegistered.is(e.event));
    const hash = requestEvent?.event.data[0]?.toString();

    if (!hash) {
      throw new Error(`[Bridge]: Unable to restore ETH bridge request hash from SORA transaction "${txId}"`);
    }

    throwIfBridgeTrackingAborted(signal);
    this.updateTransactionParams(id, { hash });
  }

  protected async ensureOutgoingRequestHash(id: string, signal?: AbortSignal): Promise<void> {
    throwIfBridgeTrackingAborted(signal);
    const { hash } = this.getTransaction(id);

    if (hash) {
      const requestStatus = await raceWithBridgeTrackingAbort(ethBridgeApi.getRequestStatus(hash), signal);

      if (requestStatus != null) {
        return;
      }
    }

    await this.restoreOutgoingRequestHash(id, signal);
  }

  /**
   * Stops read-only reconciliation once the signed SORA extrinsic is known to
   * have failed. A finalized block hash alone is not proof that the bridge
   * request was registered successfully.
   */
  private throwIfOutgoingSoraTransactionFailed(id: string): void {
    const transaction = this.getTransaction(id);

    if (transaction.status !== TransactionStatus.Error) return;

    const failure = transaction.errorMessage;
    const detail =
      typeof failure === 'string'
        ? failure.trim()
        : isRecord(failure) && typeof failure.section === 'string' && typeof failure.name === 'string'
          ? `${failure.section}.${failure.name}`
          : '';
    const transactionId = transaction.txId ?? transaction.hash ?? id;
    const suffix = detail ? `: ${detail}` : '';

    throw new Error(`[Bridge]: SORA transaction "${transactionId}" failed${suffix}`);
  }

  /**
   * Keeps reconciling a signed SORA request through transient RPC/event gaps.
   * A non-terminal provider failure must leave tracking pending, not require a
   * user to press Retry after the chain transaction has already succeeded.
   */
  private async waitForOutgoingRequestHash(id: string, signal?: AbortSignal): Promise<void> {
    while (true) {
      throwIfBridgeTrackingAborted(signal);
      this.throwIfOutgoingSoraTransactionFailed(id);

      try {
        await this.ensureOutgoingRequestHash(id, signal);
        this.throwIfOutgoingSoraTransactionFailed(id);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        this.throwIfOutgoingSoraTransactionFailed(id);
      }

      await waitForBridgeTrackingDelay(SORA_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS, signal);
    }
  }

  /** Checks whether the stored hash already resolves to a bridge request. */
  private async hasKnownOutgoingRequestHash(id: string, signal?: AbortSignal): Promise<boolean> {
    throwIfBridgeTrackingAborted(signal);
    const { hash } = this.getTransaction(id);

    if (!hash) {
      return false;
    }

    return (await raceWithBridgeTrackingAbort(ethBridgeApi.getRequestStatus(hash), signal)) != null;
  }

  /**
   * Reconciles SDK callback data with the indexer until the submitted SORA
   * transaction can be identified. A delayed Pinia refresh or indexer row must
   * not turn an already-submitted transfer into a manual Retry operation.
   */
  private async waitForOutgoingSoraMetadata(id: string, signal?: AbortSignal): Promise<void> {
    while (true) {
      throwIfBridgeTrackingAborted(signal);
      this.throwIfOutgoingSoraTransactionFailed(id);

      try {
        const { blockId, hash, txId } = this.getTransaction(id);

        if (blockId || (await this.hasKnownOutgoingRequestHash(id, signal))) {
          return;
        }

        if ((txId || hash) && (await this.restoreOutgoingTransactionBlock(id, signal))) {
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        this.throwIfOutgoingSoraTransactionFailed(id);
        // Indexer and RPC reads are advisory here; retry while the signed SORA
        // transaction remains authoritative in persisted bridge history.
      }

      await waitForBridgeTrackingDelay(SORA_TRANSACTION_DISCOVERY_POLL_INTERVAL_MS, signal);
    }
  }

  /**
   * Waits for the SORA side unless history was restored after submission.
   * Restored rows do not always include the transient SDK `status` field.
   */
  protected async waitForOutgoingSoraPartSubmitted(id: string, signal?: AbortSignal): Promise<void> {
    await this.waitForOutgoingSoraMetadata(id, signal);
  }
}

export class EthBridgeOutgoingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory, signal?: AbortSignal): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            throwIfBridgeTrackingAborted(signal);
            this.beforeSubmit(id);

            const tx = this.getTransaction(id);

            // transaction not signed
            if (!tx.txId) {
              await this.beforeSign(id);
              const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;
              try {
                await ethBridgeApi.transfer(asset, tx.to as string, tx.amount as string, id);
              } catch (error) {
                // The SDK persists the signed extrinsic hash before sending.
                // If the RPC response is lost after node acceptance, preserve
                // that evidence and reconcile read-only instead of signing a
                // potentially duplicate transfer on Retry.
                if (!this.getTransaction(id).txId) throw error;
              }
              throwIfBridgeTrackingAborted(signal);
            }

            // SORA_PENDING owns reconciliation. Advancing immediately avoids
            // treating a normal indexer delay as a failed signed transfer.
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            await this.waitForOutgoingSoraPartSubmitted(id, signal);
            await this.waitForOutgoingRequestHash(id, signal);

            const tx = this.getTransaction(id);

            const { to } = await waitForApprovedRequest(tx, signal);

            throwIfBridgeTrackingAborted(signal);
            // Keep the original recipient so the Ethereum signing guard can
            // detect a mismatched proof instead of silently replacing it.
            if (!tx.to) this.updateTransactionParams(id, { to });
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalOutgoing, signal),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => {
            await this.onEvmPending(id, signal);
            throwIfBridgeTrackingAborted(signal);
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }
    }
  }
}

export class EthBridgeIncomingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory, signal?: AbortSignal): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          // Marks this as the same live signing run. A restored EVM_SUBMITTED
          // row has no volatile progress marker and must reconcile first.
          handler: async (id: string) => this.beforeSubmit(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalIncoming, signal),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id, signal),
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_COMMITED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const tx = this.getTransaction(id);
            const { hash, blockId } = await waitForIncomingRequest(tx, signal);
            this.updateTransactionParams(id, { hash, blockId });
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }
    }
  }
}
