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
    name: 'walletconnect',
    patterns: ['/node_modules/@walletconnect/', '/node_modules/@reown/'],
  },
  {
    name: 'ethers',
    patterns: ['/node_modules/ethers/', '/node_modules/@metamask/'],
  },
  {
    name: 'cede',
    patterns: ['/node_modules/@cedelabs/'],
  },
  {
    name: 'polkadot-vendor',
    patterns: ['/vendor/@polkadot/', '/node_modules/@polkadot/'],
  },
  {
    name: 'open-web3',
    patterns: ['/node_modules/@open-web3/'],
  },
  {
    name: 'graphql',
    patterns: [
      '/node_modules/@urql/',
      '/node_modules/graphql/',
      '/node_modules/graphql-ws/',
      '/node_modules/subscriptions-transport-ws/',
    ],
  },
  {
    name: 'charts',
    patterns: ['/node_modules/echarts/', '/node_modules/vue-echarts/'],
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
