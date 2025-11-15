/**
 * Configures and re-exports the shared SDK API singletons so every consumer
 * talks to the same Polkadot connection with the wallet-specific storage
 * bindings.
 */
import { api, connection } from '@sora-substrate/sdk';
export { connection, api };
