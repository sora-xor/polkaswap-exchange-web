import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise } from '@polkadot/api';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

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
  if (subBridgeApi.formatAddress(recipient.toString()) !== to) return false;
  // asset check
  if (assetId.toString() !== asset.address) return false;
  // amount check
  // [WARNING] Implementation could be changed: sora parachain doesn't spent xcm fee from amount
  if (amount.toString() !== sended) return false;

  return true;
};
