/**
 * App-owned facade for the wallet runtime singletons. Import this shim from
 * application code instead of reaching into the vendored wallet source tree.
 */
export { api, connection } from '@/lib/soraneo-wallet/src/api';
