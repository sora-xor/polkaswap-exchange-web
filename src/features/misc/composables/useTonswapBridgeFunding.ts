import { computed, ref } from 'vue';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import { api } from '@/lib/soraneo-wallet/src/api';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWeb3Store } from '@/stores/web3';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';
import { getTsFundingQuery, parseGetTsFundingPurpose, type GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { normalizeGetTsAmount } from '@/features/misc/lib/getTsPlan';

/** Only canonical Ethereum assets with a runtime-registered SORA counterpart may enter this flow. */
export const TONSWAP_ETHEREUM_FUNDING_ASSETS = {
  XOR: {
    assetAddress: '0x0200000000000000000000000000000000000000000000000000000000000000',
    externalAddress: '0x40fd72257597aa14c7231a7b1aaa29fce868f677',
    externalDecimals: 18,
    kind: 'Thischain',
  },
  DAI: {
    assetAddress: '0x0200060000000000000000000000000000000000000000000000000000000000',
    externalAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
    externalDecimals: 18,
    kind: 'Sidechain',
  },
  ETH: {
    assetAddress: '0x0200070000000000000000000000000000000000000000000000000000000000',
    externalAddress: '0x0000000000000000000000000000000000000000',
    externalDecimals: 18,
    kind: 'Sidechain',
  },
  USDT: {
    assetAddress: '0x0083a6b3fbc6edae06f115c8953ddd7cbfba0b74579d6ea190f96853073b76f4',
    externalAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    externalDecimals: 6,
    kind: 'Sidechain',
  },
} as const;

export type TonswapEthereumFundingSymbol = keyof typeof TONSWAP_ETHEREUM_FUNDING_ASSETS;
export type TonswapBridgeFundingError =
  | 'connection-unavailable'
  | 'wrong-network'
  | 'asset-unavailable'
  | 'ethereum-wallet-required'
  | 'denomination-unavailable'
  | 'selection-changed'
  | 'preparation-failed';
export type PreparedTonswapBridgeFunding = {
  symbol: TonswapEthereumFundingSymbol;
  assetAddress: string;
  externalAddress: string;
  externalDecimals: number;
  /** Exact chain coefficient; Ethereum XOR natural units are divided by this on incoming transfers. */
  denominator: string;
};

const ETHEREUM_CHAIN_ID = 1;
const HASHI_MAINNET_CONTRACT = '0x313416870a4da6f12505a550b67bb73c8e21d5d3';

/** Parses only explicit fixed campaign navigation; arrays and arbitrary asset/address input are rejected. */
export function parseTonswapBridgeFundingQuery(query: Record<string, unknown>): TonswapEthereumFundingSymbol | null {
  if (!parseGetTsFundingPurpose(query) || typeof query.asset !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(TONSWAP_ETHEREUM_FUNDING_ASSETS, query.asset)
    ? (query.asset as TonswapEthereumFundingSymbol)
    : null;
}

/** Uses router locations so acquisition links preserve hash routing under static IPFS content paths. */
export function buildTonswapBridgeFundingRoute(symbol: TonswapEthereumFundingSymbol, purpose: GetTsPurpose = 'ts') {
  return { path: '/bridge', query: { ...getTsFundingQuery(purpose), asset: symbol } };
}

/**
 * Prepares the existing Hashi form without connecting wallets, switching the wallet's chain, or signing.
 * Call only after the shared SORA API is ready. Re-run after an Ethereum wallet is connected if XOR's
 * registry mapping could not yet be enriched. Readiness is metadata readiness, not a value/fee quote.
 */
export function useTonswapBridgeFunding() {
  const assets = useAssetsStore();
  const bridge = useBridgeStore();
  const web3 = useWeb3Store();
  const status = ref<'idle' | 'preparing' | 'ready' | 'unavailable'>('idle');
  const error = ref<TonswapBridgeFundingError | null>(null);
  const prepared = ref<PreparedTonswapBridgeFunding | null>(null);
  let generation = 0;

  /** Invalidates in-flight metadata work when the user leaves or changes the requested funding route. */
  function cancelPreparation(): void {
    generation += 1;
    status.value = 'idle';
    error.value = null;
    prepared.value = null;
  }

  /** Refreshes authoritative registration and the XOR coefficient before populating an incoming transfer. */
  async function prepareEthereumFunding(
    symbol: TonswapEthereumFundingSymbol,
    initialDaiAmount = ''
  ): Promise<PreparedTonswapBridgeFunding | null> {
    const request = ++generation;
    status.value = 'preparing';
    error.value = null;
    prepared.value = null;
    const fail = (code: TonswapBridgeFundingError): null => {
      if (request === generation) {
        error.value = code;
        status.value = 'unavailable';
      }
      return null;
    };
    try {
      if (!Object.prototype.hasOwnProperty.call(TONSWAP_ETHEREUM_FUNDING_ASSETS, symbol))
        return fail('asset-unavailable');
      const initialAmount = initialDaiAmount ? normalizeGetTsAmount(initialDaiAmount) : '';
      if (initialDaiAmount && (symbol !== 'DAI' || !initialAmount)) return fail('preparation-failed');
      const definition = TONSWAP_ETHEREUM_FUNDING_ASSETS[symbol];
      if (!definition) return fail('asset-unavailable');
      const chainApi = api.connection?.api;
      if (!chainApi?.isConnected) return fail('connection-unavailable');
      if (
        chainApi.genesisHash?.toString?.().toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS ||
        web3.ethBridgeEvmNetwork !== ETHEREUM_CHAIN_ID ||
        web3.ethBridgeContractAddress.OTHER?.toLowerCase() !== HASHI_MAINNET_CONTRACT
      )
        return fail('wrong-network');

      if (web3.networkType !== BridgeNetworkType.Eth || web3.networkSelected !== ETHEREUM_CHAIN_ID) {
        await web3.selectExternalNetwork({ id: ETHEREUM_CHAIN_ID, type: BridgeNetworkType.Eth });
      }
      if (request !== generation) return null;
      await assets.getRegisteredAssets();
      if (request !== generation) return null;
      if (web3.networkType !== BridgeNetworkType.Eth || web3.networkSelected !== ETHEREUM_CHAIN_ID) {
        return fail('selection-changed');
      }
      if (symbol === 'XOR' && !web3.isValidNetwork) return fail('ethereum-wallet-required');
      const registered = assets.registeredAssets[definition.assetAddress];
      if (
        !registered ||
        registered.address?.toLowerCase() !== definition.externalAddress ||
        registered.decimals !== definition.externalDecimals ||
        registered.kind !== definition.kind
      )
        return fail('asset-unavailable');

      let denominator = '1';
      if (symbol === 'XOR') {
        const coefficient = await api.system.getDenominator();
        if (request !== generation) return null;
        denominator = coefficient.toString();
        if (!coefficient.isFinity() || !/^[1-9]\d*$/.test(denominator)) return fail('denomination-unavailable');
        // Use the same validated live coefficient that the existing bridge amount helpers consume.
        web3.$patch({ denominator: coefficient });
      }
      if (request !== generation) return null;
      if (web3.networkType !== BridgeNetworkType.Eth || web3.networkSelected !== ETHEREUM_CHAIN_ID) {
        return fail('selection-changed');
      }
      if (api.connection?.api !== chainApi || !chainApi.isConnected) return fail('connection-unavailable');
      bridge.updateForm({ isSoraToEvm: false });
      await bridge.setSendedAmount();
      if (request !== generation) return null;
      await bridge.setAssetAddress(definition.assetAddress);
      if (request !== generation) return null;
      if (web3.networkType !== BridgeNetworkType.Eth || web3.networkSelected !== ETHEREUM_CHAIN_ID) {
        return fail('selection-changed');
      }
      if (api.connection?.api !== chainApi || !chainApi.isConnected) return fail('connection-unavailable');
      if (initialAmount) await bridge.setSendedAmount(initialAmount);
      if (request !== generation) return null;
      prepared.value = { symbol, ...definition, denominator };
      status.value = 'ready';
      return prepared.value;
    } catch {
      return fail('preparation-failed');
    }
  }

  return {
    status,
    error,
    prepared,
    isPreparing: computed(() => status.value === 'preparing'),
    prepareEthereumFunding,
    cancelPreparation,
  };
}
