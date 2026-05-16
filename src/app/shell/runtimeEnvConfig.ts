import { appendStaticAssetVersion, resolveVersionedStaticAssetUrl } from '@/utils/staticAssets';

import type { FeatureFlags } from '@/stores/settings/types';
import type { EthBridgeSettings, SubNetworkApps } from '@/stores/web3/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

export type RuntimeEnvConfig = Partial<{
  NETWORK_TYPE: string;
  TG_BOT_URL: string;
  API_KEYS: Record<string, string>;
  ETH_BRIDGE: EthBridgeSettings;
  FEATURE_FLAGS: FeatureFlags;
  EVM_NETWORKS_IDS: EvmNetwork[];
  SUB_NETWORKS: SubNetworkApps;
  POLKASWAP_INDEXER_ENDPOINT: string;
  FAUCET_URL: string;
  DEFAULT_NETWORKS: unknown[];
  CHAIN_GENESIS_HASH: string;
}>;

export type RuntimeEnvConfigPayloadResolution =
  | {
      ok: true;
      config: RuntimeEnvConfig;
    }
  | {
      ok: false;
      isHtmlFallback: boolean;
      payloadType: string;
    };

/**
 * Builds runtime config URLs in lookup order for IPFS-relative and origin-root fallbacks.
 */
export const buildRuntimeEnvConfigUrls = (candidate: string, origin?: string): string[] => {
  const envConfigUrls = [resolveVersionedStaticAssetUrl(candidate)];
  const normalizedCandidate = candidate.replace(/^\/+/g, '');

  if (typeof origin === 'string') {
    try {
      const rootConfigUrl = appendStaticAssetVersion(new URL(normalizedCandidate, `${origin}/`).toString());
      if (!envConfigUrls.includes(rootConfigUrl)) {
        envConfigUrls.push(rootConfigUrl);
      }
    } catch {
      // Ignore malformed runtime location values and continue with resolved URLs.
    }
  }

  return envConfigUrls;
};

/**
 * Validates the loaded runtime env payload before the shell applies config.
 */
export const resolveRuntimeEnvConfigPayload = (data: unknown): RuntimeEnvConfigPayloadResolution => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return {
      ok: true,
      config: data as RuntimeEnvConfig,
    };
  }

  const payloadType = Array.isArray(data) ? 'array' : typeof data;
  const payloadPreview = typeof data === 'string' ? data.trim().slice(0, 32).toLowerCase() : undefined;

  return {
    ok: false,
    isHtmlFallback: payloadType === 'string' && payloadPreview?.startsWith('<!doctype html') === true,
    payloadType,
  };
};
