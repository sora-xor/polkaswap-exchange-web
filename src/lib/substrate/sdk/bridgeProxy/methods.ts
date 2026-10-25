import { map } from 'rxjs';
import { u8aToHex } from '@polkadot/util';

import type { Observable } from '@polkadot/types/types';
import type {
  BridgeTypesGenericNetworkId,
  BridgeProxyBridgeRequest,
  BridgeTypesGenericAccount,
  BridgeTypesGenericTimepoint,
  XcmV2Junction,
  XcmV3Junction,
} from '@polkadot/types/lookup';
import type { Option } from '@polkadot/types-codec';
import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { CodecString } from '@sora-substrate/math';
import type { GenericNetworkId } from '@sora-substrate/types';

import { toAssetId } from '../assets';

import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from './consts';

import type { BridgeNetworkId, BridgeTransactionData } from './types';
import type { SubNetwork, ParachainIds } from './sub/types';

function accountFromJunction(junction: XcmV2Junction | XcmV3Junction): string {
  if (junction.isAccountId32) {
    return junction.asAccountId32.id.toString();
  } else if (junction.isAccountKey20) {
    const { key } = junction.asAccountKey20;
    return u8aToHex(key);
  } else {
    return '';
  }
}

function getAccount(data: BridgeTypesGenericAccount): string {
  if (data.isUnknown) {
    return '';
  }
  if (data.isEvm) {
    return data.asEvm.toString();
  }
  if (data.isSora) {
    return data.asSora.toString();
  }
  if (data.isParachain) {
    const { interior } = data.asParachain.isV3 ? data.asParachain.asV3 : data.asParachain.asV2;

    if (interior.isX1) {
      return accountFromJunction(interior.asX1);
    } else if (interior.isX2) {
      return accountFromJunction(interior.asX2[1]);
    } else {
      return '';
    }
  }
  if (data.isLiberland) {
    return data.asLiberland.toString();
  }

  return '';
}

export function getEvmNetworkType(network: BridgeTypesGenericNetworkId | GenericNetworkId) {
  if (network.isEvm) return BridgeNetworkType.Evm;
  return BridgeNetworkType.Eth;
}

function getNetworkType(network: BridgeTypesGenericNetworkId | GenericNetworkId): BridgeNetworkType {
  if (network.isSub) return BridgeNetworkType.Sub;
  return getEvmNetworkType(network);
}

export function getEvmNetworkId(network: BridgeTypesGenericNetworkId | GenericNetworkId): number {
  if (network.isEvmLegacy) return network.asEvmLegacy.toNumber();

  return parseInt(network.asEvm.toString(), 16);
}

function getNetworkId(network: BridgeTypesGenericNetworkId | GenericNetworkId): BridgeNetworkId {
  if (network.isSub) return network.asSub.toString() as SubNetwork;

  return getEvmNetworkId(network);
}

function getSubNetworkId(
  data: BridgeTypesGenericAccount,
  networkParam: BridgeTypesGenericNetworkId,
  usedNetwork: SubNetwork,
  parachainIds?: ParachainIds
): BridgeNetworkId | null {
  if (!data.isParachain) return usedNetwork;

  const { interior } = data.asParachain.isV3 ? data.asParachain.asV3 : data.asParachain.asV2;

  // this is relaychain as in networkParam
  if (interior.isX1) {
    return getNetworkId(networkParam);
  }
  // this is parachain
  if (interior.isX2) {
    const [networkJunction] = interior.asX2;

    if (networkJunction.isParachain) {
      const paraId = networkJunction.asParachain.toNumber();

      if (parachainIds?.[usedNetwork as keyof ParachainIds] === paraId) {
        return usedNetwork;
      }
    }
  }

  return null;
}

function getBlock(data: BridgeTypesGenericTimepoint): number {
  if (data.isEvm) {
    return data.asEvm.toNumber();
  }
  if (data.isSora) {
    return data.asSora.toNumber();
  }
  if (data.isParachain) {
    return data.asParachain.toNumber();
  }

  return 0;
}

function formatBridgeTx(
  hash: string,
  data: Option<BridgeProxyBridgeRequest>,
  networkParam: BridgeTypesGenericNetworkId,
  usedNetworkId: BridgeNetworkId,
  parachainIds?: ParachainIds
): BridgeTransactionData | null {
  if (!data.isSome) {
    return null;
  }

  const unwrapped = data.unwrap();
  const formatted: BridgeTransactionData = {} as any;
  const externalNetworkSrc = unwrapped.direction.isInbound ? unwrapped.source : unwrapped.dest;
  const externalNetworkId = networkParam.isSub
    ? getSubNetworkId(externalNetworkSrc, networkParam, usedNetworkId as SubNetwork, parachainIds)
    : getNetworkId(networkParam);

  if (externalNetworkId !== usedNetworkId) return null;

  formatted.externalNetwork = externalNetworkId;
  formatted.externalNetworkType = getNetworkType(networkParam);
  formatted.soraHash = hash;
  formatted.amount = unwrapped.amount.toString();
  formatted.soraAssetAddress = toAssetId(unwrapped.assetId);
  formatted.status = BridgeTxStatus.Pending;
  if (unwrapped.status.isFailed || unwrapped.status.isRefunded) {
    formatted.status = BridgeTxStatus.Failed;
  } else if (unwrapped.status.isDone || unwrapped.status.isCommitted) {
    formatted.status = BridgeTxStatus.Done;
  }
  formatted.startBlock = getBlock(unwrapped.startTimepoint);
  formatted.endBlock = getBlock(unwrapped.endTimepoint);

  if (unwrapped.direction.isInbound) {
    // incoming: network -> SORA
    formatted.externalAccount = getAccount(unwrapped.source);
    formatted.soraAccount = getAccount(unwrapped.dest);
    formatted.direction = BridgeTxDirection.Incoming;
  } else {
    // outgoing: SORA -> network
    formatted.soraAccount = getAccount(unwrapped.source);
    formatted.externalAccount = getAccount(unwrapped.dest);
    formatted.direction = BridgeTxDirection.Outgoing;
  }

  return formatted;
}

/**
 * Get all user transactions from external network
 */
export async function getUserTransactions(
  api: ApiPromise,
  accountAddress: string,
  networkParam: BridgeTypesGenericNetworkId,
  usedNetworkId: BridgeNetworkId,
  parachainIds?: ParachainIds
): Promise<BridgeTransactionData[]> {
  try {
    const buffer: BridgeTransactionData[] = [];
    const data = await api.query.bridgeProxy.transactions.entries([networkParam, accountAddress]);

    for (const [key, value] of data) {
      const hash = key.args[1];
      const tx = formatBridgeTx(hash.toString(), value, networkParam, usedNetworkId, parachainIds);

      if (tx) {
        buffer.push(tx);
      }
    }

    return buffer;
  } catch {
    return [];
  }
}

/** Get transaction details */
export async function getTransactionDetails(
  api: ApiPromise,
  accountAddress: string,
  hash: string,
  networkParam: BridgeTypesGenericNetworkId,
  usedNetworkId: BridgeNetworkId,
  parachainIds?: ParachainIds
): Promise<BridgeTransactionData | null> {
  try {
    const data = await api.query.bridgeProxy.transactions([networkParam, accountAddress], hash);

    return formatBridgeTx(hash, data, networkParam, usedNetworkId, parachainIds);
  } catch {
    return null;
  }
}

/** Subscribe on transaction details */
export function subscribeOnTransactionDetails(
  apiRx: ApiRx,
  accountAddress: string,
  hash: string,
  networkParam: BridgeTypesGenericNetworkId,
  usedNetworkId: BridgeNetworkId,
  parachainIds?: ParachainIds
): Observable<BridgeTransactionData | null> | null {
  try {
    return apiRx.query.bridgeProxy
      .transactions([networkParam, accountAddress], hash)
      .pipe(map((value) => formatBridgeTx(hash, value, networkParam, usedNetworkId, parachainIds)));
  } catch {
    return null;
  }
}

/** Get the amount of the asset locked on the bridge on the SORA side */
export async function getLockedAssets(
  api: ApiPromise,
  networkParam: BridgeTypesGenericNetworkId,
  assetAddress: string
): Promise<CodecString | null> {
  try {
    const data = await api.query.bridgeProxy.lockedAssets(networkParam, assetAddress);

    return data.toString();
  } catch {
    return null;
  }
}
