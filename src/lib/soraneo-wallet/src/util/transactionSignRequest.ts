import type { WithKeyring } from '@sora-substrate/sdk';
import type { KeyringPair } from '@polkadot/keyring/types';
import { toRaw } from 'vue';

type SignRequest = {
  token: symbol;
  confirmed: boolean;
  assertCurrent: () => void;
  confirm: (password: string) => void;
};

// Root and bridge APIs share the exact keyring pair, while their API objects differ.
const pendingRequests = new WeakMap<KeyringPair, SignRequest>();

/** Opens one explicit signing decision for a captured local identity and connection. */
export function beginTransactionSignRequest(signerApi: WithKeyring) {
  const pair = toRaw(signerApi.accountPair);
  if (!pair) throw new Error('Signing account is unavailable.');
  if (pendingRequests.has(pair)) throw new Error('A signing confirmation is already pending.');

  const { address, signer, connection } = signerApi;
  const chain = connection?.api;
  const genesis = chain?.genesisHash?.toString();
  const token = Symbol('transaction-sign');
  const assertCurrent = () => {
    if (
      toRaw(signerApi.accountPair) !== pair ||
      signerApi.address !== address ||
      signerApi.signer !== signer ||
      signerApi.connection !== connection ||
      connection?.api !== chain ||
      chain?.genesisHash?.toString() !== genesis ||
      pendingRequests.get(pair)?.token !== token
    ) {
      throw new Error('Signing context changed; review the transaction again.');
    }
  };

  if (!pair.isLocked) pair.lock();
  const request: SignRequest = {
    token,
    confirmed: false,
    assertCurrent,
    confirm(password) {
      assertCurrent();
      signerApi.unlockPair(password);
      assertCurrent();
      if (pair.isLocked) throw new Error('Signing account is locked.');
      request.confirmed = true;
    },
  };
  pendingRequests.set(pair, request);

  return {
    /** Closure alone is cancellation, including when another flow unlocked the key. */
    assertConfirmed() {
      assertCurrent();
      if (!request.confirmed || pair.isLocked) throw new Error('Cancelled');
    },
    /** Removes only this request and locks its original pair on any unsuccessful exit. */
    finish(accepted: boolean) {
      if (pendingRequests.get(pair) === request) pendingRequests.delete(pair);
      if (!accepted && !pair.isLocked) pair.lock();
    },
  };
}

/** Capture this token at the confirmation click, before any asynchronous UI work. */
export function getTransactionSignRequest(signerApi: WithKeyring): symbol | undefined {
  const pair = toRaw(signerApi.accountPair);
  return pair ? pendingRequests.get(pair)?.token : undefined;
}

/** Confirms exactly the captured request; delayed clicks cannot approve a replacement dialog. */
export function confirmTransactionSign(signerApi: WithKeyring, password: string, token: symbol | undefined): void {
  const pair = toRaw(signerApi.accountPair);
  const request = pair ? pendingRequests.get(pair) : undefined;
  if (!token || request?.token !== token) throw new Error('Signing confirmation expired.');
  request.confirm(password);
}
