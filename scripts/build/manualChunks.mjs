/**
 * Normalizes Rollup module ids so chunk rules behave consistently across
 * macOS/Linux paths, Windows paths, aliased source files, and vendored deps.
 *
 * @param {string} id
 * @returns {string}
 */
export const normalizeChunkId = (id = '') => id.replaceAll('\\', '/');

const CHUNK_RULES = [
  {
    name: 'ui-kit',
    patterns: ['/src/lib/soramitsu-ui/', '/packages/soramitsu-js-ui-library/'],
  },
  {
    name: 'wallet-stack',
    patterns: [
      '/src/lib/soraneo-wallet/',
      '/src/shims/wallet.ts',
      '/src/plugins/wallet.ts',
      '/src/utils/walletCore.ts',
      '/src/utils/walletModule.ts',
      '/src/adapters/wallet/',
      '/src/views/utils/resolveWalletOverlayVisibility.ts',
    ],
  },
  {
    name: 'bridge',
    patterns: [
      '/src/stores/bridge/',
      '/src/store/web3/',
      '/src/stores/web3/',
      '/src/views/Bridge',
      '/src/components/pages/Bridge/',
      '/src/utils/bridge/',
      '/src/utils/connection/evm/',
      '/src/composables/useBridge',
      '/src/composables/useMoonpayBridge.ts',
      '/src/composables/useWalletConnect.ts',
      '/src/consts/evm.ts',
      '/src/consts/sub.ts',
      '/src/types/bridge.ts',
      '/src/types/evm/',
    ],
  },
  {
    name: 'order-book',
    patterns: [
      '/src/store/orderBook/',
      '/src/stores/orderBook/',
      '/src/views/OrderBook.vue',
      '/src/components/pages/OrderBook/',
      '/src/composables/useOrderBook',
      '/src/utils/orderBook.ts',
      '/src/types/orderBook.ts',
      '/src/indexer/queries/orderBook/',
      '/src/plugins/echarts.ts',
    ],
  },
  {
    name: 'staking-defi',
    patterns: [
      '/src/store/staking/',
      '/src/store/vault/',
      '/src/store/demeterFarming/',
      '/src/store/rewards/',
      '/src/store/pool/',
      '/src/store/addLiquidity/',
      '/src/store/removeLiquidity/',
      '/src/modules/staking/',
      '/src/indexer/queries/staking/',
      '/src/indexer/queries/vault/',
      '/src/indexer/queries/accountLiquidity/',
      '/src/indexer/queries/pool/',
    ],
  },
  {
    name: 'substrate-sdk',
    patterns: [
      '/src/lib/substrate/',
      '/vendor/@polkadot/',
      '/node_modules/@polkadot/',
      '/node_modules/@open-web3/',
    ],
  },
  {
    name: 'evm-stack',
    patterns: [
      '/node_modules/ethers/',
      '/node_modules/@walletconnect/',
      '/node_modules/@reown/',
      '/node_modules/@metamask/',
      '/node_modules/@cedelabs/',
    ],
  },
  {
    name: 'charts',
    patterns: ['/node_modules/echarts/', '/node_modules/vue-echarts/'],
  },
  {
    name: 'data-clients',
    patterns: [
      '/node_modules/@urql/',
      '/node_modules/graphql/',
      '/node_modules/graphql-ws/',
      '/node_modules/subscriptions-transport-ws/',
      '/node_modules/rxjs/',
    ],
  },
  {
    name: 'shared-utils',
    patterns: [
      '/vendor/lodash-es/',
      '/node_modules/lodash/',
      '/node_modules/dayjs/',
      '/node_modules/date-fns/',
      '/node_modules/crypto-js/',
    ],
  },
];

/**
 * Returns a coarse manual chunk name for the heaviest app domains. The goal is
 * to keep the number of IPFS requests low without forcing all lazy imports
 * back into one giant bundle.
 *
 * @param {string} id
 * @returns {string | undefined}
 */
export const getManualChunk = (id) => {
  const normalizedId = normalizeChunkId(id);

  if (!normalizedId || normalizedId.startsWith('\0')) return undefined;

  const rule = CHUNK_RULES.find(({ patterns }) => patterns.some((pattern) => normalizedId.includes(pattern)));

  return rule?.name;
};
