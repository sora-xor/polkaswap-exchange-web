import { KnownAssets } from '@sora-substrate/sdk/build/assets/consts';

import { agentError } from './errors';
import type { AgentAsset, AgentAssetRef, AgentAssetsRequest } from './types';

import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type WalletAssetState = {
  assets?: Asset[];
  accountAssetsAddressTable?: Record<string, AccountAsset | RegisteredAccountAsset>;
};

type AssetsStoreLike = {
  assetDataByAddress(address?: Nullable<string>): Nullable<RegisteredAccountAsset>;
};

type AssetApiLike = {
  assets?: {
    getAssetInfo?(address: string): Promise<Asset>;
  };
};

export type AgentAssetContext = {
  walletStore: WalletAssetState;
  assetsStore: AssetsStoreLike;
  api: AssetApiLike;
  nodeReady: boolean;
};

const normalizeAddress = (address: string): string => {
  const trimmed = address.trim();
  return trimmed.startsWith('0x') ? trimmed.toLowerCase() : trimmed;
};

const getAssetAddress = (asset: Partial<Asset>): string => normalizeAddress(`${asset.address ?? ''}`);

const hasBalance = (asset: Partial<RegisteredAccountAsset>): asset is RegisteredAccountAsset => Boolean(asset.balance);

export function toAgentAsset(asset: Asset | RegisteredAccountAsset, includeBalance = false): AgentAsset {
  const agentAsset: AgentAsset = {
    address: asset.address,
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    type: asset.type,
    isMintable: asset.isMintable,
  };

  if (includeBalance && hasBalance(asset as Partial<RegisteredAccountAsset>)) {
    agentAsset.balance = (asset as RegisteredAccountAsset).balance;
  }

  return agentAsset;
}

function collectRawAssets(context: AgentAssetContext, includeBalances = false): Array<Asset | RegisteredAccountAsset> {
  const { walletStore, assetsStore } = context;
  const assetsByAddress = new Map<string, Asset | RegisteredAccountAsset>();

  const addAsset = (asset?: Nullable<Asset | RegisteredAccountAsset>) => {
    if (!asset?.address) return;
    const address = getAssetAddress(asset);
    const enriched = includeBalances ? (assetsStore.assetDataByAddress(address) ?? asset) : asset;
    assetsByAddress.set(address, enriched);
  };

  KnownAssets.forEach(addAsset);
  walletStore.assets?.forEach(addAsset);
  Object.values(walletStore.accountAssetsAddressTable ?? {}).forEach(addAsset);

  return [...assetsByAddress.values()];
}

export function collectAssets(context: AgentAssetContext, request: AgentAssetsRequest = {}): AgentAsset[] {
  const includeBalances = Boolean(request.includeBalances);
  const query = request.query?.trim().toLowerCase() ?? '';

  return collectRawAssets(context, includeBalances)
    .map((asset) => toAgentAsset(asset, includeBalances))
    .filter((asset) => {
      if (!query) return true;
      return [asset.address, asset.symbol, asset.name].some((value) => value?.toLowerCase().includes(query));
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.address.localeCompare(b.address));
}

function validateAssetRef(ref: AgentAssetRef, fieldName: string): void {
  const address = ref?.address?.trim();
  const symbol = ref?.symbol?.trim();

  if (address || symbol) return;

  throw agentError('INVALID_ASSET_REF', `${fieldName} must include an address or symbol.`, { fieldName, ref });
}

async function resolveAssetByAddress(
  context: AgentAssetContext,
  address: string
): Promise<Asset | RegisteredAccountAsset> {
  const normalizedAddress = normalizeAddress(address);
  const fromStore = context.assetsStore.assetDataByAddress(normalizedAddress);
  if (fromStore) return fromStore;

  const known = KnownAssets.get(normalizedAddress);
  if (known) return known;

  if (context.nodeReady && typeof context.api.assets?.getAssetInfo === 'function') {
    try {
      return await context.api.assets.getAssetInfo(normalizedAddress);
    } catch {
      // Fall through to a structured not-found error below.
    }
  }

  throw agentError('ASSET_NOT_FOUND', 'Asset address was not found.', { address: normalizedAddress });
}

function resolveAssetBySymbol(context: AgentAssetContext, symbol: string): Asset | RegisteredAccountAsset {
  const normalizedSymbol = symbol.trim().toLowerCase();
  const matches = collectRawAssets(context, true).filter((asset) => asset.symbol.toLowerCase() === normalizedSymbol);

  if (matches.length === 0) {
    throw agentError('ASSET_NOT_FOUND', 'Asset symbol was not found.', { symbol });
  }

  const uniqueByAddress = new Map(matches.map((asset) => [normalizeAddress(asset.address), asset]));
  if (uniqueByAddress.size > 1) {
    throw agentError('ASSET_AMBIGUOUS', 'Asset symbol matches multiple assets. Use an address instead.', {
      symbol,
      matches: [...uniqueByAddress.values()].map(({ address, name }) => ({ address, name })),
    });
  }

  return [...uniqueByAddress.values()][0] as Asset;
}

export async function resolveAssetRef(
  context: AgentAssetContext,
  ref: AgentAssetRef,
  fieldName: string
): Promise<Asset | RegisteredAccountAsset> {
  validateAssetRef(ref, fieldName);

  if (ref.address?.trim()) {
    return await resolveAssetByAddress(context, ref.address);
  }

  return resolveAssetBySymbol(context, ref.symbol as string);
}
