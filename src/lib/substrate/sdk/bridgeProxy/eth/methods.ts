import { FPNumber } from '@sora-substrate/math';

import type { Vec, Result } from '@polkadot/types';
import type { OutgoingRequestEncoded, SignatureParams } from '@sora-substrate/types';
import type { EthBridgeRequestsOffchainRequest } from '@polkadot/types/lookup';

import { toAssetId } from '../../assets';
import { BridgeTxDirection, BridgeTxStatus } from '../consts';
import { EthCurrencyType } from './consts';

import type { EthRequest, EthApprovedRequest } from './types';

export function assertRequest(result: Result<any, any>, message: string): void {
  if (!result.isOk) {
    // Throws error
    const err = result.asErr.toString();
    console.error(`[${message}]:`, err);
    throw err;
  }
}

export function formatRequest(request: EthBridgeRequestsOffchainRequest, status: BridgeTxStatus): EthRequest | null {
  const formattedItem = {} as EthRequest;
  formattedItem.status = status.toString() as BridgeTxStatus;
  formattedItem.direction = BridgeTxDirection.Incoming;

  if (request.isIncoming) {
    const transferRequest = request.asIncoming[0].asTransfer;
    const assetId = toAssetId(transferRequest.assetId);
    formattedItem.soraAssetAddress = assetId;
    formattedItem.amount = new FPNumber(transferRequest.amount).toString();
    formattedItem.from = transferRequest.author.toString();
    formattedItem.kind = transferRequest.assetKind.toString();
    formattedItem.hash = transferRequest.txHash.toString();
  } else if (request.isLoadIncoming) {
    const txRequest = request.asLoadIncoming.asTransaction;
    // TODO: formattedItem.soraAssetAddress is missed here
    formattedItem.from = txRequest.author.toString();
    formattedItem.kind = txRequest.kind.toString();
    formattedItem.hash = txRequest.hash.toString();
  } else if (request.isOutgoing) {
    formattedItem.direction = BridgeTxDirection.Outgoing;
    const outgoingRequest = request.asOutgoing;
    const transferRequest = outgoingRequest[0].asTransfer;
    const assetId = toAssetId(transferRequest.assetId);
    formattedItem.soraAssetAddress = assetId;
    formattedItem.amount = new FPNumber(transferRequest.amount).toString();
    formattedItem.from = transferRequest.from.toString();
    formattedItem.to = transferRequest.to.toString();
    formattedItem.hash = outgoingRequest[1].toString();
  } else {
    return null;
  }

  return formattedItem;
}

export function formatApprovedRequest(
  request: OutgoingRequestEncoded,
  proofs: Vec<SignatureParams>
): EthApprovedRequest {
  const formattedItem = {} as EthApprovedRequest;
  const transferRequest = request.asTransfer;

  formattedItem.hash = transferRequest.txHash.toString();
  formattedItem.from = transferRequest.from.toString();
  formattedItem.to = transferRequest.to.toString();
  formattedItem.amount = new FPNumber(transferRequest.amount).toCodecString();
  formattedItem.currencyType = transferRequest.currencyId.isAssetId
    ? EthCurrencyType.AssetId
    : EthCurrencyType.TokenAddress;

  formattedItem.r = [];
  formattedItem.s = [];
  formattedItem.v = [];

  for (const proof of proofs) {
    formattedItem.r.push(proof.r.toString());
    formattedItem.s.push(proof.s.toString());
    formattedItem.v.push(proof.v.toNumber() + 27);
  }

  return formattedItem;
}
