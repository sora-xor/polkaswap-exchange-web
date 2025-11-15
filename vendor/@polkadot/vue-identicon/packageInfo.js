export const packageInfo = {
  name: '@polkadot/vue-identicon',
  path:
    import.meta && import.meta.url
      ? new URL(import.meta.url).pathname.substring(0, new URL(import.meta.url).pathname.lastIndexOf('/') + 1)
      : 'auto',
  type: 'esm',
  version: '4.0.0',
};
