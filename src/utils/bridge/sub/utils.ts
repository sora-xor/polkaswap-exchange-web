import { FPNumber, Operation } from '@sora-substrate/sdk';

import { subBridgeApi } from '@/utils/bridge/sub/api';
import { isDisplayOnlyRecoveredSubBridgeHistory } from '@/utils/bridge/sub/reconciliation';
import { SubTransferType } from '@/utils/bridge/sub/types';

import type { CodecString, WithConnectionApi } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

export const isOutgoingTx = (tx: SubHistory): boolean => {
  return tx.type === Operation.SubstrateOutgoing;
};

/**
 * Returns whether an incoming Substrate bridge transfer records a prior source
 * submission attempt and therefore must never enter the signing path again.
 *
 * Every caller that can reach a signing path must use this predicate: bridge
 * tracking deliberately clears or moves transaction hashes as it advances, so
 * checking `txId` alone can submit the same source burn twice after recovery.
 * Individual fields such as `txId` or `startBlock` do not by themselves prove
 * chain inclusion; recovery must verify the source events or SORA request.
 */
export const hasSubBridgeIncomingSubmissionEvidence = (tx: SubHistory): boolean => {
  if (isOutgoingTx(tx) || isDisplayOnlyRecoveredSubBridgeHistory(tx)) return false;

  return Boolean(
    tx.txId ||
    tx.externalHash ||
    tx.blockId ||
    tx.externalBlockId ||
    tx.hash ||
    tx.payload?.submissionState !== undefined ||
    tx.payload?.startBlock !== undefined ||
    tx.payload?.batchNonce !== undefined ||
    tx.payload?.messageNonce !== undefined
  );
};

/**
 * Returns whether a recorded incoming attempt has enough identifiers for a
 * read-only recovery check. A request hash is directly queryable on SORA;
 * otherwise the source hash needs either a known block or the signed-height
 * search window. This is intentionally stricter than the no-resign guard.
 */
export const hasSubBridgeIncomingTrackingEvidence = (tx: SubHistory): boolean => {
  if (isOutgoingTx(tx) || isDisplayOnlyRecoveredSubBridgeHistory(tx)) return false;
  if (typeof tx.hash === 'string' && tx.hash.trim()) return true;

  const sourceHash = [tx.externalHash, tx.txId].some((value) => typeof value === 'string' && value.trim());
  const sourceBlock = [tx.externalBlockId, tx.blockId].some((value) => typeof value === 'string' && value.trim());
  const sourceStartBlock = Number(tx.payload?.startBlock);

  return sourceHash && (sourceBlock || (Number.isSafeInteger(sourceStartBlock) && sourceStartBlock >= 0));
};

/** Returns whether a Substrate bridge transfer has no recorded submission evidence. */
export const isUnsignedTx = (tx: SubHistory): boolean => {
  if (isDisplayOnlyRecoveredSubBridgeHistory(tx)) return false;
  if (hasSubBridgeIncomingSubmissionEvidence(tx)) return false;

  const incomingExternalHash = !isOutgoingTx(tx) ? tx.externalHash : undefined;
  const signId =
    subBridgeApi.isEvmAccount(tx.externalNetwork as SubNetwork) && !isOutgoingTx(tx)
      ? incomingExternalHash
      : (tx.txId ?? incomingExternalHash);

  return !(tx.blockId || tx.externalBlockId || signId);
};

/**
 * Loads the authoritative local Sub bridge record before considering a UI
 * cache entry. The cache can stay pinned while another bridge family is
 * selected, so allowing it to win would hide retry state transitions written
 * to the persisted Sub history.
 */
export const findTransaction = (id: string): SubHistory | null => {
  const history = (subBridgeApi.history ?? {}) as Record<string, SubHistory>;
  const keyedTransaction = (subBridgeApi.getHistory(id) as SubHistory | null) ?? history[id];

  if (keyedTransaction) return keyedTransaction;

  return (
    Object.values(history).find((item) => {
      return item?.id === id || item?.hash === id || item?.txId === id || item?.externalHash === id;
    }) ?? null
  );
};

export const getTransaction = (id: string, cachedTransaction?: SubHistory | null): SubHistory => {
  const tx = findTransaction(id) ?? cachedTransaction;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = (id: string, params = {}): void => {
  const tx = getTransaction(id);
  const data = { ...tx, ...params };
  subBridgeApi.saveHistory(data);
};

export const determineTransferType = (network: SubNetwork) => {
  if (subBridgeApi.isSoraParachain(network)) {
    return SubTransferType.SoraParachain;
  } else if (subBridgeApi.isRelayChain(network)) {
    return SubTransferType.Relaychain;
  } else if (subBridgeApi.isStandalone(network)) {
    return SubTransferType.Standalone;
  } else {
    return SubTransferType.Parachain;
  }
};

export const isEvent = (e, section: string, method: string) => {
  return e.event.section === section && e.event.method === method;
};

export const isQueueMessage = (e) =>
  isEvent(e, 'messageQueue', 'Processed') ||
  isEvent(e, 'xcmpQueue', 'Success') ||
  isEvent(e, 'xcmpQueue', 'Fail') ||
  isEvent(e, 'dmpQueue', 'ExecutedDownward');

export const isParaInclusion = (e) => isEvent(e, 'paraInclusion', 'CandidateIncluded');

export const isXcmPalletAttempted = (e) => isEvent(e, 'xcmPallet', 'Attempted');

export const isTransactionFeePaid = (e) => isEvent(e, 'transactionPayment', 'TransactionFeePaid');

export const isBridgeProxyUpdate = (e) => isEvent(e, 'bridgeProxy', 'RequestStatusUpdate');

export const getBridgeProxyHash = (events: Array<any>): string => {
  const bridgeProxyEvent = events.find((e) => isBridgeProxyUpdate(e));

  if (!bridgeProxyEvent) {
    throw new Error(`Unable to find "bridgeProxy.RequestStatusUpdate" event`);
  }

  return bridgeProxyEvent.event.data[0].toString();
};

export const isSoraBridgeProviderUpdate = (e) => isEvent(e, 'soraBridgeProvider', 'RequestStatusUpdate');

/** Extracts the SORA bridge request hash emitted by a standalone Liberland burn. */
export const getSoraBridgeProviderHash = (events: Array<any>): string => {
  const bridgeProviderEvent = events.find((e) => isSoraBridgeProviderUpdate(e));

  if (!bridgeProviderEvent) {
    throw new Error(`Unable to find "soraBridgeProvider.RequestStatusUpdate" event`);
  }

  return bridgeProviderEvent.event.data[0].toString();
};

export const isBridgeProxyHash = (e: any, hash: string): boolean => {
  if (!isBridgeProxyUpdate(e)) return false;

  const proxyHash = e.event.data[0].toString();

  return hash === proxyHash;
};

export const getDepositedBalance = (events: Array<any>, to: string, chainApi: WithConnectionApi): [string, number] => {
  const recipient = chainApi.formatAddress(to).toLowerCase();

  const index = events.findIndex((e) => {
    let eventRecipient = '';

    if (isEvent(e, 'balances', 'Deposit') || isEvent(e, 'balances', 'Minted') || isEvent(e, 'tokens', 'Deposited')) {
      eventRecipient = e.event.data.who.toString();
    } else if (isEvent(e, 'assets', 'Transfer')) {
      eventRecipient = e.event.data[1].toString();
    } else if (isEvent(e, 'assets', 'Issued')) {
      eventRecipient = e.event.data.owner.toString();
    }

    if (!eventRecipient) return false;

    const formatted = chainApi.formatAddress(eventRecipient).toLowerCase();

    return formatted === recipient;
  });

  if (index === -1) throw new Error(`Unable to find balance deposit like event`);

  const event = events[index];
  const balance = event.event.data.amount?.toString() ?? event.event.data[3].toString();

  return [balance, index];
};

export const getReceivedAmount = (sendedAmount: string, receivedAmount: CodecString, decimals?: number) => {
  const sended = new FPNumber(sendedAmount, decimals);
  const received = FPNumber.fromCodecValue(receivedAmount, decimals);
  const amount2 = received.toString();
  const transferFee = sended.sub(received).toCodecString();

  return { amount: amount2, transferFee };
};

export const getParachainSystemMessageHash = (events: Array<any>) => {
  const parachainSystemEvent = events.find(
    (e) => isEvent(e, 'parachainSystem', 'UpwardMessageSent') || isEvent(e, 'xcmpQueue', 'XcmpMessageSent')
  );

  if (!parachainSystemEvent) {
    throw new Error(`Unable to find "parachainSystem.UpwardMessageSent" event`);
  }

  return parachainSystemEvent.event.data[0].toString();
};

export const isMessageAccepted = (e) => isEvent(e, 'substrateBridgeOutboundChannel', 'MessageAccepted');

export const getMessageAcceptedNonces = (events: Array<any>): [number, number] => {
  const messageAcceptedEvent = events.find((e) => isMessageAccepted(e));

  if (!messageAcceptedEvent) {
    throw new Error('Unable to find "substrateBridgeOutboundChannel.MessageAccepted" event');
  }

  const batchNonce = messageAcceptedEvent.event.data[1].toNumber();
  const messageNonce = messageAcceptedEvent.event.data[2].toNumber();

  return [batchNonce, messageNonce];
};

export const isMessageDispatched = (e) => isEvent(e, 'substrateDispatch', 'MessageDispatched');

export const getMessageDispatchedNonces = (events: Array<any>): [number, number] => {
  const messageDispatchedEvent = events.find((e) => isMessageDispatched(e));

  if (!messageDispatchedEvent) {
    throw new Error('Unable to find "substrateDispatch.MessageDispatched" event');
  }

  const { batchNonce, messageNonce } = messageDispatchedEvent.event.data[0];
  const eventBatchNonce = batchNonce.unwrap().toNumber();
  const eventMessageNonce = messageNonce.toNumber();

  return [eventBatchNonce, eventMessageNonce];
};

export const isMessageDispatchedNonces = (sendedBatchNonce: number, sendedMessageNonce: number, e: any): boolean => {
  if (!isMessageDispatched(e)) return false;

  const { batchNonce, messageNonce } = e.event.data[0];

  const eventBatchNonce = batchNonce.unwrap().toNumber();
  const eventMessageNonce = messageNonce.toNumber();

  if (eventBatchNonce > sendedBatchNonce) {
    throw new Error(
      `Parachain channel batch nonce ${eventBatchNonce} is larger than tx batch nonce ${sendedBatchNonce}`
    );
  }

  return sendedBatchNonce === eventBatchNonce && sendedMessageNonce === eventMessageNonce;
};

export const isAssetAddedToChannel = (
  e: any,
  asset: RegisteredAccountAsset,
  to: string,
  sended: CodecString,
  chainApi: WithConnectionApi
): boolean => {
  if (!isEvent(e, 'xcmApp', 'AssetAddedToChannel')) return false;

  const { amount, assetId, recipient } = e.event.data[0].asTransfer;
  // address check
  if (chainApi.formatAddress(recipient.toString()) !== chainApi.formatAddress(to)) return false;
  // asset check
  if (assetId.toString() !== asset.address) return false;
  // amount check
  // [WARNING] Implementation could be changed: sora parachain doesn't spent xcm fee from amount
  if (amount.toString() !== sended) return false;

  return true;
};

// Liberland
export const isSoraBridgeAppBurned = (
  e: any,
  asset: RegisteredAccountAsset,
  from: string,
  to: string,
  sended: CodecString,
  chainApi: WithConnectionApi
) => {
  if (!isEvent(e, 'soraBridgeApp', 'Burned')) return false;

  const [networkIdCodec, assetIdCodec, senderCodec, recipientCodec, amountCodec] = e.event.data;

  if (!(networkIdCodec.isMainnet && recipientCodec.isSora)) return false;

  const sender = senderCodec.toString();
  const recipient = recipientCodec.asSora.toString();
  const assetId = assetIdCodec.isLld ? '' : assetIdCodec.asAsset.toString();
  const amount = amountCodec.toString();

  // address check
  if (chainApi.formatAddress(sender) !== chainApi.formatAddress(from)) return false;
  if (chainApi.formatAddress(recipient) !== chainApi.formatAddress(to)) return false;
  // asset check
  if (assetId !== asset.externalAddress) return false;
  // amount check
  if (amount !== sended) return false;

  return true;
};
