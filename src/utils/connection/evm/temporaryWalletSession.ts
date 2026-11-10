import { reactive, readonly } from 'vue';

/**
 * Page-memory state of the optional temporary Ethereum wallet (see `temporaryWallet.ts`).
 *
 * This module never imports `ethers` and never holds key material, so the app shell can watch for
 * signing requests without loading wallet code. It only knows the wallet address and the transaction
 * currently waiting for the user's approval.
 */

/** EIP-1193 provider error (https://eips.ethereum.org/EIPS/eip-1193#provider-errors). */
export class TemporaryWalletProviderError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'TemporaryWalletProviderError';
    this.code = code;
    this.data = data;
  }
}

/** Error codes from EIP-1193 and JSON-RPC that the temporary wallet returns. */
export const TemporaryWalletErrorCode = {
  UserRejected: 4001,
  Unauthorized: 4100,
  Unsupported: 4200,
  Disconnected: 4900,
  ChainDisconnected: 4901,
  /** Same message shape as Ethereum nodes, so ethers reports `INSUFFICIENT_FUNDS`. */
  InsufficientFunds: -32000,
  RequestPending: -32002,
  InvalidParams: -32602,
  Internal: -32603,
} as const;

/** Fee figures of a transaction waiting for approval. All amounts are exact wei as decimal strings. */
export interface TemporaryWalletRequestFigures {
  gasLimit: string;
  maxFeePerGas: string;
  /** Gas estimate × (current base fee + tip): what the transaction most likely costs. */
  estimatedFee: string;
  /** Gas limit × max fee per gas: the most the network fee can be. */
  maxFee: string;
}

/** A transaction the temporary wallet was asked to sign. Amounts are exact wei as decimal strings. */
export interface TemporaryWalletRequest extends TemporaryWalletRequestFigures {
  id: number;
  from: string;
  to: string;
  value: string;
  data: string;
  /** A fee refresh raised the maximum cost after the request was shown: the new figures need a new approval. */
  feeIncreased: boolean;
  /** Signing or broadcasting is under way; the request can no longer be rejected. */
  busy: boolean;
}

/** Result of one approval attempt: a broadcast transaction hash, or new figures to show before signing. */
export type TemporaryWalletApproval = { hash: string } | { retry: TemporaryWalletRequestFigures };

interface TemporaryWalletSessionState {
  /** Lower-case address of the open temporary wallet; empty when none is open. */
  address: string;
  /** The wallet is also saved, encrypted, in this browser, so closing the tab does not lose it. */
  persisted: boolean;
  request: TemporaryWalletRequest | null;
}

/** Decides whether a transaction is a step of the purchase the user started, which the page may sign unasked. */
export type TemporaryWalletAutoApproval = (
  request: Omit<TemporaryWalletRequest, 'id' | 'feeIncreased' | 'busy'>
) => boolean;

const state = reactive<TemporaryWalletSessionState>({ address: '', persisted: false, request: null });
let handlers: { id: number; approve: () => Promise<void>; reject: (error: Error) => void } | null = null;
let sequence = 0;
let autoApproval: TemporaryWalletAutoApproval | null = null;
/** Attempts when fees keep rising between preparing and signing an automatic step. */
const AUTO_ATTEMPTS = 3;

/** Read-only view for components: the open wallet's address and the request waiting for approval. */
export const temporaryWalletSession = readonly(state);

const userRejected = () =>
  new TemporaryWalletProviderError(TemporaryWalletErrorCode.UserRejected, 'User rejected the request.');

/** Makes the browser ask before the tab closes, because closing it deletes the wallet. */
function guardUnload(event: BeforeUnloadEvent): void {
  event.preventDefault();
  // Some browsers show the prompt only when `returnValue` is set.
  event.returnValue = '';
}

/** The page asks before unloading only while a wallet exists in page memory alone. */
function syncUnloadGuard(): void {
  if (typeof window === 'undefined') return;
  window.removeEventListener('beforeunload', guardUnload);
  if (state.address && !state.persisted) window.addEventListener('beforeunload', guardUnload);
}

/**
 * Records the open wallet (or its closing, with an empty address). While a wallet exists only in page memory the
 * page asks before unloading; closing it rejects a request that has not been signed yet and ends automatic signing.
 */
export function setTemporaryWalletAddress(address: string, persisted = false): void {
  state.address = address.toLowerCase();
  state.persisted = !!address && persisted;
  syncUnloadGuard();
  if (!address) autoApproval = null;
  if (!address && handlers && !state.request?.busy) {
    handlers.reject(
      new TemporaryWalletProviderError(TemporaryWalletErrorCode.Disconnected, 'The temporary wallet was closed.')
    );
  }
}

/** Marks the open wallet as saved in (or removed from) encrypted browser storage. */
export function setTemporaryWalletPersisted(persisted: boolean): void {
  state.persisted = !!state.address && persisted;
  syncUnloadGuard();
}

/**
 * While a card purchase runs, the transactions `policy` accepts (its own conversion and bridge steps) are signed
 * without the dialog, as the user asked. Everything else still waits for Approve. `null` ends automatic signing.
 */
export function setTemporaryWalletAutoApproval(policy: TemporaryWalletAutoApproval | null): void {
  autoApproval = policy;
}

async function signAutomatically(approve: () => Promise<TemporaryWalletApproval>): Promise<string> {
  for (let attempt = 0; attempt < AUTO_ATTEMPTS; attempt++) {
    const result = await approve();
    if ('hash' in result) return result.hash;
  }
  throw new TemporaryWalletProviderError(
    TemporaryWalletErrorCode.Internal,
    'Ethereum network fees kept rising. Try again in a minute.'
  );
}

/**
 * Shows a transaction for approval and settles with its hash once `approve` signs and broadcasts it.
 * `approve` runs only after the user's explicit click. It may return new figures instead of a hash
 * when fees rose since the request was shown; the user then has to approve again.
 * Only one request can wait at a time; a second one fails with `-32002`, like other wallets.
 */
export function requestTemporaryWalletApproval(
  request: Omit<TemporaryWalletRequest, 'id' | 'feeIncreased' | 'busy'>,
  approve: () => Promise<TemporaryWalletApproval>
): Promise<string> {
  let automatic = false;
  try {
    automatic = !!autoApproval?.(request);
  } catch {
    automatic = false;
  }
  if (automatic) return signAutomatically(approve);
  if (state.request) {
    return Promise.reject(
      new TemporaryWalletProviderError(
        TemporaryWalletErrorCode.RequestPending,
        'Another request is waiting for approval.'
      )
    );
  }
  const id = ++sequence;
  state.request = { ...request, id, feeIncreased: false, busy: false };

  return new Promise<string>((resolve, reject) => {
    const finish = (): void => {
      if (state.request?.id === id) state.request = null;
      if (handlers?.id === id) handlers = null;
    };
    handlers = {
      id,
      approve: async () => {
        const current = state.request;
        if (!current || current.id !== id || current.busy) return;
        current.busy = true;
        try {
          const result = await approve();
          if ('retry' in result) {
            if (state.request?.id === id)
              Object.assign(state.request, result.retry, { feeIncreased: true, busy: false });
            return;
          }
          finish();
          resolve(result.hash);
        } catch (error) {
          finish();
          reject(error);
        }
      },
      reject: (error) => {
        if (state.request?.id !== id || state.request.busy) return;
        finish();
        reject(error);
      },
    };
  });
}

/** The user's approval click: signs and broadcasts, or shows raised fees for a second approval. */
export function approveTemporaryWalletRequest(id: number): Promise<void> {
  return handlers?.id === id ? handlers.approve() : Promise.resolve();
}

/** The user's reject click (or closing the dialog). A request that is already being signed is not affected. */
export function rejectTemporaryWalletRequest(id: number): void {
  if (handlers?.id === id) handlers.reject(userRejected());
}
