import type { WithAccountPair } from './apiAccount';

const activeContexts = new WeakMap<WithAccountPair, Set<() => void>>();

/** Keeps an operation bound to the identity reviewed before asynchronous preparation. */
export function beginTransactionSigningContext(owner: WithAccountPair): () => void {
  const { accountPair, address, signer, connection, previousAccount } = owner;
  const previousPair = previousAccount?.pair;
  const chain = connection?.api;
  const genesis = chain?.genesisHash?.toString();
  const assertCurrent = () => {
    if (
      owner.accountPair !== accountPair ||
      owner.address !== address ||
      owner.signer !== signer ||
      owner.connection !== connection ||
      connection?.api !== chain ||
      chain?.genesisHash?.toString() !== genesis ||
      owner.previousAccount?.pair !== previousPair
    ) {
      throw new Error('Signing context changed; review the transaction again.');
    }
  };
  const contexts = activeContexts.get(owner) ?? new Set<() => void>();
  contexts.add(assertCurrent);
  activeContexts.set(owner, contexts);

  return () => {
    contexts.delete(assertCurrent);
    if (contexts.size === 0 && activeContexts.get(owner) === contexts) activeContexts.delete(owner);
  };
}

/** Enforces every in-flight scope so a newer confirmation cannot replace an older operation's guard. */
export function assertTransactionSigningContext(owner: WithAccountPair): void {
  for (const assertCurrent of activeContexts.get(owner) ?? []) assertCurrent();
}
