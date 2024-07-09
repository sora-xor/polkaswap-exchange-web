import { FPNumber, Operation } from '@sora-substrate/util';

import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';

import type { ApiPromise } from '@polkadot/api';
import type { CodecString, WithConnectionApi } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export const isOutgoingTx = (tx: SubHistory): boolean => {
  return tx.type === Operation.SubstrateOutgoing;
};

export const isUnsignedTx = (tx: SubHistory): boolean => {
  const signId =
    subBridgeApi.isEvmAccount(tx.externalNetwork as SubNetwork) && !isOutgoingTx(tx) ? tx.externalHash : tx.txId;

  return !tx.blockId && !signId;
};

export const getTransaction = (id: string): SubHistory => {
  const tx = subBridgeApi.getHistory(id) as SubHistory;

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

export const getBridgeProxyHash = (events: Array<any>, api: ApiPromise): string => {
  const bridgeProxyEvent = events.find((e) => api.events.bridgeProxy.RequestStatusUpdate.is(e.event));

  if (!bridgeProxyEvent) {
    throw new Error(`Unable to find "bridgeProxy.RequestStatusUpdate" event`);
  }

  return bridgeProxyEvent.event.data[0].toString();
};

export const isEvent = (e, section: string, method: string) => {
  return e.event.section === section && e.event.method === method;
};

export const isTransactionFeePaid = (e) => isEvent(e, 'transactionPayment', 'TransactionFeePaid');

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

export const getParachainSystemMessageHash = (events: Array<any>, api: ApiPromise) => {
  const parachainSystemEvent = events.find(
    (e) => api.events.parachainSystem.UpwardMessageSent.is(e.event) || api.events.xcmpQueue.XcmpMessageSent.is(e.event)
  );

  if (!parachainSystemEvent) {
    throw new Error(`Unable to find "parachainSystem.UpwardMessageSent" event`);
  }

  return parachainSystemEvent.event.data.messageHash.toString();
};

export const getMessageAcceptedNonces = (events: Array<any>, api: ApiPromise): [number, number] => {
  const messageAcceptedEvent = events.find((e) =>
    api.events.substrateBridgeOutboundChannel.MessageAccepted.is(e.event)
  );

  if (!messageAcceptedEvent) {
    throw new Error('Unable to find "substrateBridgeOutboundChannel.MessageAccepted" event');
  }

  const batchNonce = messageAcceptedEvent.event.data[1].toNumber();
  const messageNonce = messageAcceptedEvent.event.data[2].toNumber();

  return [batchNonce, messageNonce];
};

export const getMessageDispatchedNonces = (events: Array<any>, api: ApiPromise): [number, number] => {
  const messageDispatchedEvent = events.find((e) => api.events.substrateDispatch.MessageDispatched.is(e.event));

  if (!messageDispatchedEvent) {
    throw new Error('Unable to find "substrateDispatch.MessageDispatched" event');
  }

  const { batchNonce, messageNonce } = messageDispatchedEvent.event.data[0];
  const eventBatchNonce = batchNonce.unwrap().toNumber();
  const eventMessageNonce = messageNonce.toNumber();

  return [eventBatchNonce, eventMessageNonce];
};

export const isMessageDispatchedNonces = (
  sendedBatchNonce: number,
  sendedMessageNonce: number,
  e: any,
  api: ApiPromise
): boolean => {
  if (!api.events.substrateDispatch.MessageDispatched.is(e.event)) return false;

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
