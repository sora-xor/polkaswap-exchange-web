import { FPNumber, Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { combineLatest, firstValueFrom, from, timeout, TimeoutError } from 'rxjs';

import { ZeroStringValue } from '@/consts';
import { conditionalAwait } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import { areBridgeExternalAccountsEqual } from '@/utils/bridge/common/account';
import { BridgeTransactionSignDialogMode, type IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { getTransactionEvents } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import {
  getSubBridgeFailureCode,
  isDisplayOnlyRecoveredSubBridgeHistory,
  isSubBridgeTerminalFailureStatus,
  reconcileSubBridgeRequest,
  SubBridgeAuthoritativeStatus,
  SubBridgeReconciliationErrorCode,
  type SubBridgeRecoveryPayload,
  type SubBridgeRequestReconciliation,
} from '@/utils/bridge/sub/reconciliation';
import { SubTransferType } from '@/utils/bridge/sub/types';
import ethersUtil from '@/utils/ethers-util';
import {
  getBridgeProxyHash,
  getDepositedBalance,
  getMessageAcceptedNonces,
  getSoraBridgeProviderHash,
  hasSubBridgeIncomingSubmissionEvidence,
  isMessageDispatchedNonces,
  isAssetAddedToChannel,
  isSoraBridgeAppBurned,
  determineTransferType,
  getReceivedAmount,
  getParachainSystemMessageHash,
  isXcmPalletAttempted,
  isTransactionFeePaid,
  isQueueMessage,
} from '@/utils/bridge/sub/utils';

import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';
import type { Nullable } from '@/types/common';

type SubBridgeReducerOptions<T extends IBridgeTransaction> = IBridgeReducerOptions<T> & {
  getSubBridgeConnector: () => SubNetworksConnector;
};

type RestoredSubstrateTransactionBlock = {
  blockId: string;
  blockHeight: number;
};

const SUBSTRATE_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/i;
const SUBSTRATE_TRANSACTION_BLOCK_LOOKBACK = 2;
const SUBSTRATE_TRANSACTION_BLOCK_LOOKAHEAD = 64;
/** Maximum time allowed for the bounded historical source-block scan. */
export const SUBSTRATE_TRANSACTION_RECOVERY_TIMEOUT_MS = 2 * 60 * 1_000;

const isValidSubstrateBlockHeight = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
/** Maximum period without a SORA bridge request update before tracking can be resumed manually. */
export const SORA_BRIDGE_DETAILS_TIMEOUT_MS = 10 * 60 * 1_000;

/** Performs the sequential RPC scan used by the bounded public recovery helper. */
const scanSubstrateTransactionBlock = async (
  transactionHash: string,
  startBlockHeight: number,
  chainApi: ApiPromise
): Promise<RestoredSubstrateTransactionBlock | null> => {
  const normalizedTransactionHash = transactionHash.trim().toLowerCase();

  if (!SUBSTRATE_TRANSACTION_HASH_PATTERN.test(normalizedTransactionHash)) {
    throw new Error(`Invalid Substrate transaction hash: "${transactionHash}"`);
  }
  if (!isValidSubstrateBlockHeight(startBlockHeight)) {
    throw new Error(`Invalid Substrate transaction start block: "${startBlockHeight}"`);
  }

  const latestBlockHeight = await api.system.getBlockNumber(undefined, chainApi);

  if (!isValidSubstrateBlockHeight(latestBlockHeight)) {
    throw new Error(`Invalid latest Substrate block height: "${latestBlockHeight}"`);
  }

  const firstBlockHeight = Math.max(0, startBlockHeight - SUBSTRATE_TRANSACTION_BLOCK_LOOKBACK);
  const lastBlockHeight = Math.min(latestBlockHeight, startBlockHeight + SUBSTRATE_TRANSACTION_BLOCK_LOOKAHEAD);

  for (let blockHeight = firstBlockHeight; blockHeight <= lastBlockHeight; blockHeight += 1) {
    const blockId = await api.system.getBlockHash(blockHeight, chainApi);
    const extrinsics = await api.system.getExtrinsicsFromBlock(blockId, chainApi);
    const transactionFound = extrinsics.some(
      (extrinsic) => extrinsic.hash.toString().toLowerCase() === normalizedTransactionHash
    );

    if (transactionFound) {
      return { blockId, blockHeight };
    }
  }

  return null;
};

/**
 * Finds a submitted Substrate extrinsic in the small block window surrounding
 * the height captured immediately after submission.
 *
 * Both the block window and elapsed time are bounded: this is a recovery path
 * for a missed status callback, not an unbounded chain indexer.
 */
export const findSubstrateTransactionBlock = async (
  transactionHash: string,
  startBlockHeight: number,
  chainApi: ApiPromise
): Promise<RestoredSubstrateTransactionBlock | null> => {
  try {
    return await firstValueFrom(
      from(scanSubstrateTransactionBlock(transactionHash, startBlockHeight, chainApi)).pipe(
        timeout(SUBSTRATE_TRANSACTION_RECOVERY_TIMEOUT_MS)
      )
    );
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw new Error(SubBridgeReconciliationErrorCode.TrackingTimeout);
    }

    throw error;
  }
};

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected asset!: RegisteredAccountAsset;
  protected getSubBridgeConnector!: () => SubNetworksConnector;
  protected connector!: SubNetworksConnector;
  protected transferType!: SubTransferType;

  constructor(options: SubBridgeReducerOptions<SubHistory>) {
    super(options);

    this.getSubBridgeConnector = options.getSubBridgeConnector;
  }

  async initConnector(id: string): Promise<void> {
    const { externalNetwork } = this.getTransaction(id);

    if (!externalNetwork) throw new Error(`[${this.constructor.name}]: Transaction "externalNetwork" is not defined`);

    this.transferType = determineTransferType(externalNetwork);

    this.connector = new SubNetworksConnector();
    await this.connector.init(externalNetwork, this.getSubBridgeConnector());
  }

  async closeConnector(): Promise<void> {
    await this.connector?.stop();
  }

  /** Stops account-bound Substrate connections as soon as tracking is canceled. */
  protected override async onTrackingAbort(): Promise<void> {
    await this.closeConnector();
  }

  async getHashesByBlockNumber(blockHeight: number, apiRx: ApiRx) {
    let blockId = '';

    if (Number.isFinite(blockHeight)) {
      let subscription: Subscription | undefined;

      try {
        await new Promise<void>((resolve, reject) => {
          subscription = api.system.getBlockHashObservable(blockHeight, apiRx).subscribe({
            next: (hash) => {
              if (hash) {
                blockId = hash;
                resolve();
              }
            },
            error: reject,
          });
        });
      } finally {
        subscription?.unsubscribe();
      }
    }

    return {
      blockHeight,
      blockId,
    };
  }

  updateTransactionPayload(id: string, params: Record<string, any>) {
    const { payload: prevPayload } = this.getTransaction(id);
    this.updateTransactionParams(id, { payload: { ...prevPayload, ...params } });
  }

  async saveStartBlock(id: string): Promise<void> {
    const savedStartBlock = Number(this.getTransaction(id).payload?.startBlock);

    if (isValidSubstrateBlockHeight(savedStartBlock)) return;

    const adapter =
      this.transferType === SubTransferType.Standalone ? this.connector.network : this.connector.soraParachain;

    if (!adapter) throw new Error(`[${this.constructor.name}]: Adapter is not exists`);

    await adapter.connect();
    // get current sora parachain block number
    const startBlock = Number(await adapter.getBlockNumber());

    if (!isValidSubstrateBlockHeight(startBlock)) {
      throw new Error(`[${this.constructor.name}]: Unable to determine a valid source start block`);
    }
    // update history data
    this.updateTransactionPayload(id, { startBlock });
  }

  async waitForTxBlockAndStatus(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const sourceTransactionHash = [tx.externalHash, tx.txId].find((value) => typeof value === 'string' && value.trim());
    const isSignedStandaloneIncoming =
      tx.type === Operation.SubstrateIncoming &&
      this.transferType === SubTransferType.Standalone &&
      Boolean(sourceTransactionHash);

    if (isSignedStandaloneIncoming) {
      if (tx.blockId || tx.externalBlockId) return;
      if (await this.restoreTransactionBlockId(id)) return;

      await this.waitForTransactionBlockId(id);
      return;
    }

    await this.waitForTransactionStatus(id);
    const updatedTx = this.getTransaction(id);

    if (updatedTx.blockId || updatedTx.externalBlockId) return;
    if (await this.restoreTransactionBlockId(id)) return;

    await this.waitForTransactionBlockId(id);
  }

  /** Restores a missed Liberland in-block callback without re-signing the burn. */
  protected override async restoreTransactionBlockId(id: string): Promise<boolean> {
    const tx = this.getTransaction(id);

    if (tx.blockId || tx.externalBlockId) return true;
    if (tx.type !== Operation.SubstrateIncoming || this.transferType !== SubTransferType.Standalone) return false;

    const transactionHash =
      [tx.txId, tx.externalHash].find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';
    const startBlockHeight = Number(tx.payload?.startBlock);

    if (!transactionHash) {
      throw new Error(`[${this.constructor.name}]: Transaction hash is unavailable for block restoration`);
    }
    if (!isValidSubstrateBlockHeight(startBlockHeight)) {
      throw new Error(`[${this.constructor.name}]: Start block is unavailable for transaction "${transactionHash}"`);
    }

    const adapter = this.connector.network;

    if (!adapter) throw new Error(`[${this.constructor.name}]: External network adapter is unavailable`);

    await adapter.connect();

    const restoredBlock = await findSubstrateTransactionBlock(transactionHash, startBlockHeight, adapter.api);

    if (!restoredBlock) return false;

    this.updateTransactionParams(id, restoredBlock);
    return true;
  }
}

export class SubBridgeIncomingReducer extends SubBridgeReducer {
  private readonly pendingProcesses = new Map<string, Promise<void>>();
  /**
   * Incoming jobs share reducer-level connector, asset, and transfer fields, so
   * different transaction IDs must not execute their state machines together.
   */
  private pendingProcessQueue: Promise<void> = Promise.resolve();

  async changeState(transaction: SubHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);
    if (isDisplayOnlyRecoveredSubBridgeHistory(transaction)) return;

    switch (transaction.transactionState) {
      case BridgeTxStatus.Pending: {
        const existingProcess = this.pendingProcesses.get(transaction.id);

        if (existingProcess) return await existingProcess;

        const runProcess = () =>
          this.handleState(transaction.id, {
            nextState: BridgeTxStatus.Done,
            rejectState: BridgeTxStatus.Failed,
            handler: async (id: string) => {
              try {
                this.beforeSubmit(id);
                await this.initConnector(id);
                this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

                await this.checkTxId(id);

                if (this.transferType === SubTransferType.Standalone && !this.getTransaction(id).hash) {
                  await this.updateTxIncomingData(id);
                } else if (this.transferType !== SubTransferType.Standalone) {
                  await Promise.all([this.updateTxIncomingData(id), this.waitForSoraParachainNonce(id)]);
                }

                await this.waitForSoraInboundMessageNonce(id);
                await this.waitSoraBlockByHash(id);
                await this.onComplete(id);
              } finally {
                await this.closeConnector();
              }
            },
          });
        const process = this.pendingProcessQueue.then(runProcess, runProcess);

        this.pendingProcessQueue = process.catch(() => undefined);

        this.pendingProcesses.set(transaction.id, process);

        try {
          return await process;
        } finally {
          if (this.pendingProcesses.get(transaction.id) === process) {
            this.pendingProcesses.delete(transaction.id);
          }
        }
      }

      case BridgeTxStatus.Failed: {
        const recoveryStatus = (transaction.payload as SubBridgeRecoveryPayload | undefined)?.bridgeRecoveryStatus;

        if (recoveryStatus && isSubBridgeTerminalFailureStatus(recoveryStatus)) return;

        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Pending,
          rejectState: BridgeTxStatus.Failed,
        });
      }
    }
  }

  /** Resolves the account that would sign the unsigned external transfer. */
  private async getCurrentExternalSigner(tx: SubHistory): Promise<string> {
    if (subBridgeApi.isEvmAccount(tx.externalNetwork as SubNetwork)) {
      try {
        return await ethersUtil.getAccount();
      } catch {
        return '';
      }
    }

    return this.connector.accountApi?.address ?? '';
  }

  private async checkTxId(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;

    this.asset = { ...asset };

    if (hasSubBridgeIncomingSubmissionEvidence(tx)) return;

    const currentExternalSigner = await this.getCurrentExternalSigner(tx);

    if (!areBridgeExternalAccountsEqual(tx.to, currentExternalSigner)) {
      throw new Error(`Change account in external wallet to ${String(tx.to ?? '')}`);
    }

    // transaction not signed
    await this.beforeSign(id, this.connector.accountApi, BridgeTransactionSignDialogMode.Bridge);
    // open connections
    await this.connector.start();
    // sign transaction (from is sora account)
    await this.connector.incomingTransfer(asset, tx.from as string, tx.amount as string, id);
    // save start block when tx was signed
    await this.saveStartBlock(id);
  }

  private async updateTxSigningData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!(tx.externalBlockId && tx.externalHash && Number.isSafeInteger(Number(tx.externalBlockHeight)))) {
      const adapter = this.connector.network;

      await adapter.connect();

      const externalHash =
        [tx.externalHash, tx.txId].find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';
      const externalBlockId =
        [tx.externalBlockId, tx.blockId].find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';

      if (!(externalHash && externalBlockId)) {
        throw new Error(`[${this.constructor.name}]: External transaction block data is unavailable`);
      }

      const savedBlockHeight = Number(tx.externalBlockHeight ?? tx.blockHeight);
      const externalBlockHeight = Number.isSafeInteger(savedBlockHeight)
        ? savedBlockHeight
        : await api.system.getBlockNumber(externalBlockId, adapter.api);

      this.updateTransactionParams(id, {
        externalHash,
        externalBlockId,
        externalBlockHeight,
      });
    }
  }

  private async updateTxExternalData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    const adapter = this.connector.network;

    await adapter.connect();

    const blockHash = tx.externalBlockId as string;
    const transactionHash = tx.externalHash as string;

    if (!(blockHash && transactionHash)) {
      throw new Error(`[${this.constructor.name}]: External transaction block data is unavailable`);
    }

    const transactionEvents = await getTransactionEvents(blockHash, transactionHash, adapter.api);

    if (this.transferType === SubTransferType.Standalone) {
      this.restoreStandaloneIncomingSourceEvents(id, transactionEvents, adapter);
    }

    const feeEvent = transactionEvents.find((e) => isTransactionFeePaid(e));

    if (feeEvent) {
      const externalNetworkFee = feeEvent.event.data[1].toString();

      this.updateTransactionParams(id, { externalNetworkFee });
    }

    if (this.transferType === SubTransferType.Relaychain) {
      const xcmEvent = transactionEvents.find((e) => isXcmPalletAttempted(e));

      if (!xcmEvent?.event?.data?.[0]?.isComplete) {
        throw new Error(`[${this.constructor.name}]: Transaction is not completed`);
      }
    }
  }

  /**
   * Verifies and restores all tracking identifiers from the finalized source
   * extrinsic. Reading its historical events avoids waiting for live events
   * that cannot be replayed after a reload.
   */
  private restoreStandaloneIncomingSourceEvents(id: string, transactionEvents: any[], adapter: any): void {
    const tx = this.getTransaction(id);
    const sentAmount = new FPNumber(tx.amount as string, this.asset.externalDecimals).toCodecString();
    const burnEventIndex = transactionEvents.findIndex((event) =>
      isSoraBridgeAppBurned(event, this.asset, tx.to as string, tx.from as string, sentAmount, adapter)
    );

    if (burnEventIndex === -1) {
      throw new Error(SubBridgeReconciliationErrorCode.SourceEventsIncomplete);
    }

    const burnEvent = transactionEvents[burnEventIndex];
    let hash = '';
    let batchNonce: number | undefined;
    let messageNonce: number | undefined;

    try {
      hash = getSoraBridgeProviderHash(transactionEvents);
    } catch {
      // Some runtimes expose only the accepted message nonces. The live SORA
      // watcher can still discover the request hash from those coordinates.
    }

    try {
      // Liberland emits MessageAccepted before Burned in the same extrinsic.
      // Searching only from the Burned event forward loses the nonces during
      // recovery, even though the source burn and SORA request both succeeded.
      [batchNonce, messageNonce] = getMessageAcceptedNonces(transactionEvents);
    } catch {
      // A SORA request hash is already sufficient for authoritative storage
      // reconciliation, so missing auxiliary nonces must not discard it.
    }

    const hasMessageCoordinates = Number.isFinite(batchNonce) && Number.isFinite(messageNonce);

    if (!hash && !hasMessageCoordinates) {
      throw new Error(SubBridgeReconciliationErrorCode.SourceEventsIncomplete);
    }
    const amount2 = FPNumber.fromCodecValue(burnEvent.event.data[4].toString(), this.asset.externalDecimals).toString();

    this.updateTransactionParams(id, { ...(hash ? { hash } : {}), amount2 });

    if (hasMessageCoordinates) {
      this.updateTransactionPayload(id, { batchNonce, messageNonce });
    }
  }

  private async updateTxIncomingData(id: string): Promise<void> {
    await this.waitForTxBlockAndStatus(id);

    if (subBridgeApi.isEvmAccount(this.getTransaction(id).externalNetwork as SubNetwork)) return;

    await this.updateTxSigningData(id);
    await this.updateTxExternalData(id);
  }

  private async waitForSoraParachainNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.batchNonce) return;

    const isStandalone = this.transferType === SubTransferType.Standalone;
    const adapter = isStandalone ? this.connector.network : this.connector.soraParachain;

    if (!adapter) throw new Error(`[${this.constructor.name}] adapter is not defined`);

    const startBlockHeight: number = tx.payload.startBlock;

    if (!startBlockHeight) throw new Error(`[${this.constructor.name}] startBlockHeight is not defined`);

    const isFirstStep = [SubTransferType.SoraParachain, SubTransferType.Standalone].includes(this.transferType);
    const sended = new FPNumber(tx.amount as string, this.asset.externalDecimals).toCodecString();
    const sender = tx.to as string;
    const recipient = tx.from as string;

    let subscription: Subscription | undefined;
    let messageNonce!: number;
    let batchNonce!: number;
    let recipientAmount!: string;
    let blockNumber!: number;

    try {
      await adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe({
          next: ([eventsVec, blockHeight]) => {
            try {
              if (blockHeight > startBlockHeight + 10) {
                throw new Error(
                  `[${this.constructor.name}]: Sora parachain should have received message from ${tx.externalNetwork}`
                );
              }

              const events = [...eventsVec.toArray()].reverse();

              let assetSendEventIndex = -1;

              if (!isStandalone) {
                assetSendEventIndex = events.findIndex((e) =>
                  isAssetAddedToChannel(e, this.asset, recipient, sended, adapter)
                );

                if (assetSendEventIndex !== -1) {
                  const amountCodec = events[assetSendEventIndex].event.data[0].asTransfer.amount;
                  recipientAmount = amountCodec.isSubstrate
                    ? amountCodec.asSubstrate.toString()
                    : amountCodec.toString();
                }
              } else {
                assetSendEventIndex = events.findIndex((e) =>
                  isSoraBridgeAppBurned(e, this.asset, sender, recipient, sended, adapter)
                );

                if (assetSendEventIndex !== -1) {
                  recipientAmount = events[assetSendEventIndex].event.data[4].toString();
                }
              }

              if (assetSendEventIndex === -1) return;

              blockNumber = blockHeight;
              [batchNonce, messageNonce] = getMessageAcceptedNonces(events.slice(assetSendEventIndex));

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: reject,
        });
      });
    } finally {
      subscription?.unsubscribe();

      if (!isFirstStep) {
        // run non blocking process promise
        this.getHashesByBlockNumber(blockNumber, adapter.apiRx)
          .then(({ blockHeight, blockId }) =>
            this.updateTransactionParams(id, {
              parachainBlockHeight: blockHeight, // parachain block number
              parachainBlockId: blockId, // parachain block hash
            })
          )
          .finally(() => {
            this.closeConnector();
          });
      }
    }

    const amount2 = FPNumber.fromCodecValue(recipientAmount, this.asset.externalDecimals).toString();

    this.updateTransactionPayload(id, { messageNonce, batchNonce });
    this.updateTransactionParams(id, { amount2 });
  }

  private async waitForSoraInboundMessageNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash) return;

    if (!Number.isFinite(tx.payload?.batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(tx.payload?.messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    let subscription: Subscription | undefined;
    let soraHash!: string;
    let amount!: string;
    let eventIndex!: number;

    try {
      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(subBridgeApi.apiRx);

        subscription = eventsObservable.subscribe({
          next: (eventsVec) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const substrateDispatchEventIndex = events.findIndex((e) =>
                isMessageDispatchedNonces(tx.payload.batchNonce, tx.payload.messageNonce, e)
              );

              if (substrateDispatchEventIndex === -1) return;

              const foundedEvents = events.slice(substrateDispatchEventIndex);

              soraHash = getBridgeProxyHash(foundedEvents);

              [amount, eventIndex] = getDepositedBalance(foundedEvents, tx.from as string, subBridgeApi);

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: reject,
        });
      });
    } finally {
      subscription?.unsubscribe();
    }

    const amount2 = FPNumber.fromCodecValue(amount, this.asset.decimals).toString();

    this.updateTransactionParams(id, { hash: soraHash, amount2 });
    this.updateTransactionPayload(id, { eventIndex });
  }

  private async waitSoraBlockByHash(id: string): Promise<void> {
    const { hash, from, externalNetwork } = this.getTransaction(id);

    if (!(hash && from && externalNetwork)) {
      throw new Error(`[${this.constructor.name}] Lost transaction params`);
    }

    let subscription: Subscription | undefined;
    const reconciliation = await this.reconcileSoraRequest(from, externalNetwork, hash);
    let soraBlockNumber = this.getCompletedSoraBlock(id, reconciliation);

    if (soraBlockNumber === null) {
      const transactionDetailsObservable = subBridgeApi.subscribeOnTransactionDetails(from, externalNetwork, hash);

      if (!transactionDetailsObservable) {
        throw new Error(`[${this.constructor.name}]: Unable to observe SORA bridge transaction details`);
      }

      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          let reconciliationQueue = Promise.resolve();

          const rejectOnce = (error: unknown): void => {
            if (settled) return;

            settled = true;
            reject(error instanceof TimeoutError ? new Error(SubBridgeReconciliationErrorCode.TrackingTimeout) : error);
          };

          subscription = transactionDetailsObservable.pipe(timeout(SORA_BRIDGE_DETAILS_TIMEOUT_MS)).subscribe({
            next: (data) => {
              if (!data || settled) return;

              reconciliationQueue = reconciliationQueue
                .then(async () => {
                  if (settled) return;

                  const nextReconciliation = await this.reconcileSoraRequest(from, externalNetwork, hash, data);

                  if (settled) return;

                  const completedBlock = this.getCompletedSoraBlock(id, nextReconciliation);

                  if (completedBlock === null) return;

                  settled = true;
                  soraBlockNumber = completedBlock;
                  resolve();
                })
                .catch(rejectOnce);
            },
            error: rejectOnce,
            complete: () => {
              void reconciliationQueue.then(() => {
                if (!settled) rejectOnce(new Error(SubBridgeReconciliationErrorCode.TrackingTimeout));
              });
            },
          });
        });
      } finally {
        subscription?.unsubscribe();
      }
    }

    const finalizedSoraBlockNumber = Number(soraBlockNumber);

    if (!Number.isSafeInteger(finalizedSoraBlockNumber) || finalizedSoraBlockNumber <= 0) {
      throw new Error(SubBridgeReconciliationErrorCode.InvalidEndBlock);
    }

    const soraBlockHash = await api.system.getBlockHash(finalizedSoraBlockNumber, subBridgeApi.api);

    this.updateTransactionParams(id, {
      txId: '',
      blockId: soraBlockHash,
      blockHeight: finalizedSoraBlockNumber,
    });
  }

  /** Bounds every direct SORA storage lookup so a stalled RPC cannot leave recovery permanently in progress. */
  private async reconcileSoraRequest(
    accountAddress: string,
    externalNetwork: SubNetwork,
    hash: string,
    fallbackTransaction?: SubBridgeRequestReconciliation['transaction']
  ): Promise<Nullable<SubBridgeRequestReconciliation>> {
    try {
      return await firstValueFrom(
        from(reconcileSubBridgeRequest(accountAddress, externalNetwork, hash, fallbackTransaction)).pipe(
          timeout(SORA_BRIDGE_DETAILS_TIMEOUT_MS)
        )
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(SubBridgeReconciliationErrorCode.TrackingTimeout);
      }

      throw error;
    }
  }

  /**
   * Returns the SORA completion block only for an authoritative Done request.
   * Failed and Refunded requests stop recovery with guidance that never asks
   * the user to repeat the source burn.
   */
  private getCompletedSoraBlock(
    id: string,
    reconciliation: Nullable<SubBridgeRequestReconciliation>
  ): Nullable<number> {
    if (!reconciliation) return null;

    if (isSubBridgeTerminalFailureStatus(reconciliation.status)) {
      this.updateTransactionPayload(id, { bridgeRecoveryStatus: reconciliation.status });
      throw new Error(getSubBridgeFailureCode(reconciliation.status));
    }

    if (reconciliation.status !== SubBridgeAuthoritativeStatus.Done) return null;

    const blockHeight = reconciliation.endBlock;

    if (blockHeight === null || !Number.isSafeInteger(blockHeight) || blockHeight <= 0) {
      throw new Error(SubBridgeReconciliationErrorCode.InvalidEndBlock);
    }

    this.updateTransactionPayload(id, { bridgeRecoveryStatus: reconciliation.status });

    return blockHeight;
  }
}

export class SubBridgeOutgoingReducer extends SubBridgeReducer {
  async changeState(transaction: SubHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case BridgeTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Done,
          rejectState: BridgeTxStatus.Failed,
          handler: async (id: string) => {
            try {
              this.beforeSubmit(id);
              await this.initConnector(id);
              this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

              await this.checkTxId(id);
              await this.waitForTxBlockAndStatus(id);

              await this.waitForSendingExecution(id);
              await this.waitForIntermediateExecution(id);
              await this.waitForDestinationExecution(id);

              await this.onComplete(id);
            } finally {
              await this.closeConnector();
            }
          },
        });
      }

      case BridgeTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Pending,
          rejectState: BridgeTxStatus.Failed,
        });
      }
    }
  }

  protected updateReceivedAmount(id: string, receivedAmount: string): void {
    const tx = this.getTransaction(id);
    const { amount, transferFee } = receivedAmount
      ? getReceivedAmount(tx.amount as string, receivedAmount, this.asset.externalDecimals)
      : { amount: tx.amount, transferFee: ZeroStringValue };

    this.updateTransactionParams(id, {
      amount2: amount,
      externalNetworkFee: ZeroStringValue,
      externalTransferFee: transferFee,
    });
  }

  private async checkTxId(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;

    this.asset = { ...asset };

    if (tx.txId) return;
    // transaction not signed
    await this.beforeSign(id, subBridgeApi);
    // open connections
    await this.connector.start();
    // sign transaction
    await this.connector.outgoingTransfer(asset, tx.to as string, tx.amount as string, id);
    // save start block when tx was signed
    await this.saveStartBlock(id);
  }

  private async waitForSendingExecution(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash && Number.isFinite(tx.payload?.batchNonce) && Number.isFinite(tx.payload?.messageNonce)) return;

    const blockHash = tx.blockId as string;
    const transactionHash = tx.txId as string;
    const transactionEvents = await getTransactionEvents(blockHash, transactionHash, subBridgeApi.api);

    const hash = getBridgeProxyHash(transactionEvents);
    this.updateTransactionParams(id, { hash });

    const [batchNonce, messageNonce] = getMessageAcceptedNonces(transactionEvents);
    this.updateTransactionPayload(id, { batchNonce, messageNonce });
  }

  private async waitForIntermediateExecution(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageHash) return;

    if (!Number.isFinite(tx.payload?.batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(tx.payload?.messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    let subscription: Subscription | undefined;
    let messageHash!: string;
    let blockNumber!: number;
    let amountReceived!: string;

    const isLastStep = [SubTransferType.SoraParachain, SubTransferType.Standalone].includes(this.transferType);
    const isStandalone = SubTransferType.Standalone === this.transferType;
    const adapter = isLastStep ? this.connector.network : this.connector.soraParachain;

    if (!adapter) throw new Error(`[${this.constructor.name}] adapter is not defined`);

    try {
      await adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe({
          next: ([eventsVec, blockHeight]) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const substrateDispatchEventIndex = events.findIndex((e) =>
                isMessageDispatchedNonces(tx.payload.batchNonce, tx.payload.messageNonce, e)
              );

              if (substrateDispatchEventIndex === -1) return;

              blockNumber = blockHeight;

              if (isLastStep) {
                // Standalone has not comission (Liberland)
                if (!isStandalone) {
                  [amountReceived] = getDepositedBalance(
                    events.slice(substrateDispatchEventIndex),
                    tx.to as string,
                    adapter
                  );
                }
              } else {
                messageHash = getParachainSystemMessageHash(events.slice(substrateDispatchEventIndex));
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: reject,
        });
      });
    } finally {
      subscription?.unsubscribe();

      const updateBlockData = () =>
        this.getHashesByBlockNumber(blockNumber, adapter.apiRx)
          .then(({ blockHeight, blockId }) => {
            const [blockHeightAttr, blockIdAttr] = isLastStep
              ? ['externalBlockHeight', 'externalBlockId']
              : ['parachainBlockHeight', 'parachainBlockId'];

            this.updateTransactionParams(id, {
              [blockHeightAttr]: blockHeight,
              [blockIdAttr]: blockId,
            });
          })
          .finally(() => {
            adapter.stop();
          });

      await conditionalAwait(updateBlockData, isLastStep);
    }

    if (isLastStep) {
      this.updateReceivedAmount(id, amountReceived);
    } else {
      this.updateTransactionPayload(id, { messageHash });
    }
  }

  private async waitForDestinationExecution(id: string): Promise<void> {
    if (![SubTransferType.Relaychain, SubTransferType.Parachain].includes(this.transferType)) return;

    const tx = this.getTransaction(id);
    const messageHash = tx.payload.messageHash as string;

    if (!messageHash) throw new Error(`[${this.constructor.name}]: Transaction payload messageHash cannot be empty`);

    let subscription: Subscription | undefined;
    let blockNumber!: number;
    let amount!: string;
    let externalEventIndex!: number;

    const adapter = this.connector.network;

    try {
      await adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe({
          next: ([eventsVec, blockHeight]) => {
            // when received message is equal to sended
            let isReliableMessage = false;

            try {
              const events = eventsVec.toArray();
              const messageQueueProcessedEventIndex = events.findIndex((e) => {
                if (isQueueMessage(e)) {
                  isReliableMessage = e.event.data[0].toString() === messageHash;

                  return true;
                }
                return false;
              });

              if (messageQueueProcessedEventIndex === -1) return;

              blockNumber = blockHeight;
              // throws error, is deposit not found
              [amount, externalEventIndex] = getDepositedBalance(
                events.slice(0, messageQueueProcessedEventIndex),
                tx.to as string,
                adapter
              );

              resolve();
            } catch (error) {
              // The message is reliable, but the deposit was not found
              if (isReliableMessage) {
                reject(error);
              }
            }
          },
          error: reject,
        });
      });
    } finally {
      subscription?.unsubscribe();

      // run blocking process promise
      await this.getHashesByBlockNumber(blockNumber, adapter.apiRx)
        .then(({ blockHeight, blockId }) =>
          this.updateTransactionParams(id, {
            externalBlockHeight: blockHeight, // parachain block number
            externalBlockId: blockId, // parachain block hash
          })
        )
        .finally(() => {
          adapter.stop();
        });
    }

    this.updateReceivedAmount(id, amount);
    this.updateTransactionParams(id, { externalEventIndex });
  }
}
