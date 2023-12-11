import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/util';

import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';

import type { ApiPromise } from '@polkadot/api';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export const isUnsignedTx = (tx: SubHistory): boolean => {
  return !tx.blockId && !tx.txId;
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

export const getDepositedBalance = (events: Array<any>, to: string, api: ApiPromise): string => {
  // Native token for network
  const balancesDepositEvent = events.find(
    (e) =>
      api.events.balances.Deposit.is(e.event) &&
      subBridgeApi.formatAddress(e.event.data.who.toString()) === subBridgeApi.formatAddress(to)
  );

  if (!balancesDepositEvent) throw new Error(`Unable to find "balances.Deposit" event`);

  return balancesDepositEvent.event.data.amount.toString();
};

export const getReceivedAmount = (sendedAmount: string, receivedAmount: CodecString, decimals?: number) => {
  const sended = new FPNumber(sendedAmount, decimals);
  const received = FPNumber.fromCodecValue(receivedAmount, decimals);
  const amount2 = received.toString();
  const transferFee = sended.sub(received).toCodecString();

  return { amount: amount2, transferFee };
};

export const getParachainSystemMessageHash = (events: Array<any>, api: ApiPromise) => {
  const parachainSystemEvent = events.find((e) => api.events.parachainSystem.UpwardMessageSent.is(e.event));

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
  api: ApiPromise
): boolean => {
  if (!api.events.xcmApp.AssetAddedToChannel.is(e.event)) return false;

  const { amount, assetId, recipient } = e.event.data[0].asTransfer;
  // address check
  if (subBridgeApi.formatAddress(recipient.toString()) !== subBridgeApi.formatAddress(to)) return false;
  // asset check
  if (assetId.toString() !== asset.address) return false;
  // amount check
  // [WARNING] Implementation could be changed: sora parachain doesn't spent xcm fee from amount
  if (amount.toString() !== sended) return false;

  return true;
};

// [TECH] move to js-lib
export const formatSubAddress = (address: string, ss58: number): string => {
  const publicKey = decodeAddress(address, false);

  return encodeAddress(publicKey, ss58);
};
