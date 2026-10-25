/**
 * Configures and re-exports the shared SDK API singletons so every consumer
 * talks to the same Polkadot connection with the wallet-specific storage
 * bindings.
 */
import { api, connection } from '@/lib/substrate/sdk/api';

import { storage } from '../util/storage';

// Persist account-specific state in the wallet storage wrapper so login flows stay in sync.
api.setStorage(storage);
// Enforce locked pairs by default to avoid signing without explicit unlocks.
api.shouldPairBeLocked = true;

export { connection, api };
