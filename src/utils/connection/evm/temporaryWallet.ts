import {
  getAddress,
  HDNodeWallet,
  Interface,
  isHexString,
  Mnemonic,
  toQuantity,
  Transaction,
  Wallet,
  ZeroAddress,
} from 'ethers';

import type { AppEIPProvider, EIP1193Provider } from '@/types/evm/provider';

import {
  requestTemporaryWalletApproval,
  setTemporaryWalletAddress,
  TemporaryWalletErrorCode,
  TemporaryWalletProviderError,
  type TemporaryWalletApproval,
  type TemporaryWalletRequestFigures,
} from './temporaryWalletSession';
import {
  createTemporaryWalletVaultStore,
  openTemporaryWalletVault,
  sealTemporaryWallet,
  type TemporaryWalletVaultStore,
} from './temporaryWalletVault';

/**
 * Optional temporary Ethereum wallet for buyers without an Ethereum wallet app.
 *
 * `createTemporaryWallet()` makes a standard 12-word BIP-39 wallet (path m/44'/60'/0'/0/0) in page memory.
 * Nothing is stored or sent anywhere: the key is lost when the tab closes, unless the user saved the recovery
 * phrase (`getTemporaryWalletBackup()`), which `restoreTemporaryWallet()` accepts and any Ethereum wallet app
 * can import. `TemporaryWalletAppProvider` plugs the wallet into the app's normal EVM connection
 * (`web3Store.selectEvmProvider`), so existing bridge and conversion code uses it like MetaMask.
 *
 * The EIP-1193 provider works on Ethereum mainnet only. It forwards an allow-list of read methods to public RPC
 * endpoints and signs only `eth_sendTransaction`, after the user approves each transaction in
 * `TemporaryWalletRequestDialog` (see `temporaryWalletSession.ts`). Message signing, contract deployment and
 * EIP-4844/EIP-7702 transactions are refused.
 */

export const TEMPORARY_WALLET_UUID = 'polkaswap-temporary-wallet';
export const TEMPORARY_WALLET_DERIVATION_PATH = "m/44'/60'/0'/0/0";
/** Public Ethereum mainnet RPC endpoints with browser CORS; the second is used only when the first fails. */
export const TEMPORARY_WALLET_RPC_URLS = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'] as const;

const GWEI = 1_000_000_000n;
/** Priority fee bounds. The default applies only when neither fee history nor a suggestion is available. */
export const TEMPORARY_WALLET_MIN_TIP = GWEI / 20n;
export const TEMPORARY_WALLET_MAX_TIP = 3n * GWEI;
export const TEMPORARY_WALLET_DEFAULT_TIP = GWEI;
/** Refuses fee caps that a misbehaving RPC endpoint could use to spend the wallet on fees. */
export const TEMPORARY_WALLET_MAX_FEE_PER_GAS = 500n * GWEI;
/** Extra gas over the estimate, used when the balance covers it: 25 %, matching the purchase cost review. */
const GAS_MARGIN_PERCENT = 125n;
const MIN_GAS = 21_000n;
const MAX_GAS = 5_000_000n;
const MAX_DATA_CHARS = 2 + 2 * 131_072;
const RPC_TIMEOUT_MS = 15_000;
const MAX_RPC_RESPONSE_CHARS = 4_000_000;
const MAINNET_CHAIN_ID = '0x1';

/** Read-only JSON-RPC methods forwarded to the public endpoints. Everything else is refused. */
const READ_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'eth_syncing',
  'web3_clientVersion',
]);

/** Transaction fields that would create blob or account-delegation transactions; never signed here. */
const REFUSED_FIELDS = ['authorizationList', 'blobVersionedHashes', 'blobs', 'maxFeePerBlobGas', 'sidecars'];
const ERC20 = new Interface(['function balanceOf(address owner) view returns (uint256)']);

/** Sends one JSON-RPC request to Ethereum mainnet and returns its `result`. */
export type TemporaryWalletRpc = (method: string, params: unknown[]) => Promise<any>;

/** What the user saves to recover the wallet. */
export interface TemporaryWalletBackup {
  /** Checksummed address. */
  address: string;
  phrase: string;
  path: string;
  createdAt: number;
}

/** Translated labels for the downloadable backup file. */
export interface TemporaryWalletBackupLabels {
  title: string;
  created: string;
  address: string;
  phrase: string;
  path: string;
  warning: string;
  help: string;
}

/** Gas limit and EIP-1559 fees chosen for one transaction. */
export interface TemporaryWalletFeePlan {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/** A validated `eth_sendTransaction` request. */
export interface TemporaryWalletTransactionRequest {
  to: string;
  data: string;
  value: bigint;
  gas?: bigint;
}

/** The user typed something that is not a valid BIP-39 English recovery phrase. */
export class TemporaryWalletPhraseError extends Error {
  constructor() {
    super('Invalid recovery phrase');
    this.name = 'TemporaryWalletPhraseError';
  }
}

const providerError = (code: number, message: string, data?: unknown) =>
  new TemporaryWalletProviderError(code, message, data);
const invalidParams = (message: string) => providerError(TemporaryWalletErrorCode.InvalidParams, message);

/** JSON-RPC quantities are bounded unsigned hex integers. */
function quantity(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{1,64}$/i.test(value)) throw invalidParams(`Invalid ${field}`);
  return BigInt(value);
}

/** RPC answers that are not quantities are a network fault, not a bad request. */
function rpcQuantity(value: unknown, field: string): bigint {
  try {
    return quantity(value, field);
  } catch {
    throw providerError(TemporaryWalletErrorCode.Internal, `The Ethereum network returned an invalid ${field}`);
  }
}

/** Codes and messages for which another endpoint may answer: rate limits, overload and internal faults. */
function isRetryableRpcError(error: { code?: unknown; message?: unknown }): boolean {
  return (
    [-32005, -32603, 429].includes(Number(error.code)) ||
    /rate limit|too many requests|timed? ?out|temporarily unavailable/i.test(String(error.message ?? ''))
  );
}

/**
 * JSON-RPC transport over the public endpoints. A request moves to the next endpoint only on a transport
 * failure, a malformed reply or a rate-limit/internal error; other node errors (for example "insufficient
 * funds") are final. Rebroadcasting the same signed transaction is harmless: it has the same hash.
 */
export function createTemporaryWalletRpc(
  urls: readonly string[] = TEMPORARY_WALLET_RPC_URLS,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init)
): TemporaryWalletRpc {
  let nextId = 0;
  return async (method, params) => {
    let retryable: TemporaryWalletProviderError | undefined;
    for (const url of urls) {
      const id = ++nextId;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
      let reply: {
        jsonrpc?: unknown;
        id?: unknown;
        result?: unknown;
        error?: { code?: unknown; message?: unknown; data?: unknown };
      };
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        });
        if (!response.ok) continue;
        const text = await response.text();
        if (text.length > MAX_RPC_RESPONSE_CHARS) continue;
        reply = JSON.parse(text);
      } catch {
        continue;
      } finally {
        clearTimeout(timer);
      }
      if (!reply || typeof reply !== 'object' || reply.jsonrpc !== '2.0' || reply.id !== id) continue;
      if (reply.error && typeof reply.error === 'object') {
        const code = Number.isSafeInteger(reply.error.code)
          ? Number(reply.error.code)
          : TemporaryWalletErrorCode.Internal;
        const error = providerError(code, String(reply.error.message ?? 'Ethereum node error'), reply.error.data);
        if (!isRetryableRpcError(reply.error)) throw error;
        retryable ??= error;
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(reply, 'result')) continue;
      return reply.result;
    }
    throw retryable ?? providerError(TemporaryWalletErrorCode.Internal, 'The Ethereum network is unreachable.');
  };
}

/**
 * Chooses the gas limit and EIP-1559 fees for a transaction so that `value + gasLimit × maxFeePerGas`
 * stays within the balance; otherwise nodes reject it.
 *
 * In order of preference: 25 % extra gas with `maxFeePerGas = 2 × baseFee + tip` (the usual wallet default,
 * which survives several blocks of rising fees); the plain estimate with the same fee; the plain estimate with
 * the highest fee the balance allows, if it still covers one maximal base-fee rise (12.5 %) plus the tip.
 * Returns `null` when even that does not fit.
 */
export function planTemporaryWalletFees({
  value,
  gas,
  balance,
  baseFee,
  priorityFee,
}: {
  value: bigint;
  gas: bigint;
  balance: bigint;
  baseFee: bigint;
  priorityFee: bigint;
}): TemporaryWalletFeePlan | null {
  if (gas <= 0n || value < 0n || balance < 0n || baseFee < 0n || priorityFee < 0n) return null;
  const preferredFee = baseFee * 2n + priorityFee;
  const padded = (gas * GAS_MARGIN_PERCENT + 99n) / 100n;
  const fits = (limit: bigint, fee: bigint) => value + limit * fee <= balance;
  if (fits(padded, preferredFee))
    return { gasLimit: padded, maxFeePerGas: preferredFee, maxPriorityFeePerGas: priorityFee };
  if (fits(gas, preferredFee)) return { gasLimit: gas, maxFeePerGas: preferredFee, maxPriorityFeePerGas: priorityFee };
  if (balance <= value) return null;
  const affordable = (balance - value) / gas;
  const floor = (baseFee * 9n + 7n) / 8n + priorityFee;
  return affordable >= floor ? { gasLimit: gas, maxFeePerGas: affordable, maxPriorityFeePerGas: priorityFee } : null;
}

/**
 * Validates an `eth_sendTransaction` request from the app. Only the sender, recipient, calldata, value and gas
 * limit are taken; the wallet chooses nonce and fees itself. Contract creation, other chains and blob or
 * account-delegation fields are refused.
 */
export function parseTemporaryWalletTransaction(input: unknown, account: string): TemporaryWalletTransactionRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalidParams('Invalid transaction');
  const tx = input as Record<string, unknown>;
  if (REFUSED_FIELDS.some((field) => tx[field] !== undefined && tx[field] !== null)) {
    throw providerError(
      TemporaryWalletErrorCode.Unsupported,
      'The temporary wallet does not sign this transaction type.'
    );
  }
  if (tx.type !== undefined && tx.type !== null && quantity(tx.type, 'type') > 2n) {
    throw providerError(
      TemporaryWalletErrorCode.Unsupported,
      'The temporary wallet does not sign this transaction type.'
    );
  }
  if (tx.from !== undefined && (typeof tx.from !== 'string' || tx.from.toLowerCase() !== account.toLowerCase())) {
    throw providerError(TemporaryWalletErrorCode.Unauthorized, 'The sender is not the temporary wallet.');
  }
  if (tx.chainId !== undefined && tx.chainId !== null && quantity(tx.chainId, 'chainId') !== 1n) {
    throw providerError(
      TemporaryWalletErrorCode.ChainDisconnected,
      'The temporary wallet works only on Ethereum mainnet.'
    );
  }
  if (typeof tx.to !== 'string' || !/^0x[0-9a-f]{40}$/i.test(tx.to)) {
    throw providerError(TemporaryWalletErrorCode.Unsupported, 'The temporary wallet does not deploy contracts.');
  }
  let to: string;
  try {
    to = getAddress(tx.to);
  } catch {
    throw invalidParams('Invalid recipient');
  }
  if (to === ZeroAddress) throw invalidParams('Invalid recipient');
  const data = tx.data ?? tx.input ?? '0x';
  if (typeof data !== 'string' || !isHexString(data) || data.length % 2 !== 0 || data.length > MAX_DATA_CHARS) {
    throw invalidParams('Invalid data');
  }
  const value = tx.value === undefined || tx.value === null ? 0n : quantity(tx.value, 'value');
  const rawGas = tx.gas ?? tx.gasLimit;
  const gas = rawGas === undefined || rawGas === null ? undefined : quantity(rawGas, 'gas');
  if (gas !== undefined && (gas < MIN_GAS || gas > MAX_GAS)) throw invalidParams('Invalid gas');
  return { to, data: data.toLowerCase(), value, gas };
}

/** Lower-cases and joins the words; returns `null` unless they form a valid English BIP-39 phrase. */
export function normalizeTemporaryWalletPhrase(input: string): string | null {
  if (typeof input !== 'string' || input.length > 1_000) return null;
  const phrase = input.normalize('NFKD').trim().toLowerCase().split(/\s+/).join(' ');
  if (![12, 15, 18, 21, 24].includes(phrase.split(' ').length)) return null;
  try {
    return Mnemonic.isValidMnemonic(phrase) ? phrase : null;
  } catch {
    return null;
  }
}

/** Chain state that a transaction is planned against. */
interface TemporaryWalletChainState {
  nonce: bigint;
  balance: bigint;
  baseFee: bigint;
  tip: bigint;
  gas: bigint;
}

interface PreparedTransaction {
  plan: TemporaryWalletFeePlan;
  gas: bigint;
  figures: TemporaryWalletRequestFigures;
  /** Value plus maximum network fee: the most the transaction can take from the wallet. */
  maxCost: bigint;
}

/** Fee figures shown to the user; the likely fee uses the current base fee and tip, capped by the fee cap. */
function prepareTransaction(
  request: TemporaryWalletTransactionRequest,
  chain: TemporaryWalletChainState
): PreparedTransaction {
  const plan = planTemporaryWalletFees({
    value: request.value,
    gas: chain.gas,
    balance: chain.balance,
    baseFee: chain.baseFee,
    priorityFee: chain.tip,
  });
  if (!plan)
    throw providerError(TemporaryWalletErrorCode.InsufficientFunds, 'insufficient funds for gas * price + value');
  if (plan.maxFeePerGas > TEMPORARY_WALLET_MAX_FEE_PER_GAS) {
    throw providerError(TemporaryWalletErrorCode.Internal, 'Ethereum network fees are too high right now.');
  }
  const likely = chain.baseFee + plan.maxPriorityFeePerGas;
  const maxFee = plan.gasLimit * plan.maxFeePerGas;
  return {
    plan,
    gas: chain.gas,
    figures: {
      gasLimit: plan.gasLimit.toString(),
      maxFeePerGas: plan.maxFeePerGas.toString(),
      estimatedFee: (chain.gas * (likely < plan.maxFeePerGas ? likely : plan.maxFeePerGas)).toString(),
      maxFee: maxFee.toString(),
    },
    maxCost: request.value + maxFee,
  };
}

/**
 * The plan the user approved stays valid while its fee cap still covers one maximal base-fee rise plus its tip
 * and the balance still covers its maximum cost. Then it is signed as shown, even if suggested fees moved a little.
 */
export function canReuseTemporaryWalletPlan(
  plan: TemporaryWalletFeePlan,
  value: bigint,
  chain: Pick<TemporaryWalletChainState, 'balance' | 'baseFee'>
): boolean {
  const floor = (chain.baseFee * 9n + 7n) / 8n + plan.maxPriorityFeePerGas;
  return plan.maxFeePerGas >= floor && value + plan.gasLimit * plan.maxFeePerGas <= chain.balance;
}

type Listener = (...args: unknown[]) => void;
type Approve = typeof requestTemporaryWalletApproval;

/** EIP-1193 provider backed by the in-memory key. See the module comment for what it refuses. */
class TemporaryEthereumProvider implements EIP1193Provider {
  private readonly listeners = new Map<string, Set<Listener>>();
  /** Next nonce after our last broadcast, in case a load-balanced endpoint has not seen it yet. */
  private nextNonce: bigint | null = null;
  private closed = false;

  constructor(
    private readonly wallet: HDNodeWallet,
    private readonly rpc: TemporaryWalletRpc,
    private readonly approve: Approve
  ) {}

  /** Lower-case, as other wallets report accounts. */
  get account(): string {
    return this.wallet.address.toLowerCase();
  }

  async request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<any> {
    const method = typeof args?.method === 'string' ? args.method : '';
    const params = Array.isArray(args?.params) ? args.params : [];
    if (method === 'eth_chainId') return MAINNET_CHAIN_ID;
    if (method === 'net_version') return '1';
    if (method === 'eth_accounts') return this.closed ? [] : [this.account];
    this.assertOpen();
    switch (method) {
      case 'eth_requestAccounts':
        return [this.account];
      case 'wallet_requestPermissions':
      case 'wallet_getPermissions':
        return [
          { parentCapability: 'eth_accounts', caveats: [{ type: 'restrictReturnedAccounts', value: [this.account] }] },
        ];
      case 'wallet_revokePermissions':
        return null;
      case 'wallet_switchEthereumChain': {
        const chainId = (params[0] as { chainId?: unknown } | undefined)?.chainId;
        if (typeof chainId === 'string' && /^0x0*1$/i.test(chainId)) return null;
        throw providerError(
          TemporaryWalletErrorCode.ChainDisconnected,
          'The temporary wallet works only on Ethereum mainnet.'
        );
      }
      case 'wallet_watchAsset':
        return false;
      case 'eth_sendTransaction':
        return this.sendTransaction(params[0]);
    }
    if (READ_METHODS.has(method)) return this.rpc(method, params);
    throw providerError(
      TemporaryWalletErrorCode.Unsupported,
      `The temporary wallet does not support ${method || 'this request'}.`
    );
  }

  on(event: string, listener: Listener): this {
    if (typeof listener !== 'function') return this;
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  addListener(event: string, listener: Listener): this {
    return this.on(event, listener);
  }

  removeListener(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    return this.removeListener(event, listener);
  }

  /** The app's "disconnect" only forgets the connection; the wallet stays open on the page. */
  disconnect(): void {}

  /** Closes the wallet for good: later requests fail and listeners learn there is no account. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.emit('accountsChanged', []);
    this.listeners.clear();
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error('[Temporary wallet] listener failed', error);
      }
    });
  }

  private assertOpen(): void {
    if (this.closed) throw providerError(TemporaryWalletErrorCode.Disconnected, 'The temporary wallet was closed.');
  }

  /**
   * Shows the request, then signs at the user's click. Fresh chain state supplies the nonce; the approved fee cap
   * is kept unless it can no longer get the transaction included, and the user never signs a higher maximum
   * cost than the one shown: raised figures go back to the dialog for a new approval.
   */
  private async sendTransaction(input: unknown): Promise<string> {
    const request = parseTemporaryWalletTransaction(input, this.account);
    let shown = prepareTransaction(request, await this.readChain(request));
    return this.approve(
      { from: this.account, to: request.to, value: request.value.toString(), data: request.data, ...shown.figures },
      async (): Promise<TemporaryWalletApproval> => {
        this.assertOpen();
        const chain = await this.readChain(request, shown.gas);
        let plan = shown.plan;
        if (!canReuseTemporaryWalletPlan(plan, request.value, chain)) {
          const fresh = prepareTransaction(request, chain);
          if (fresh.maxCost > shown.maxCost) {
            shown = fresh;
            return { retry: fresh.figures };
          }
          plan = fresh.plan;
        }
        const signed = await this.wallet.signTransaction({
          type: 2,
          chainId: 1n,
          nonce: Number(chain.nonce),
          to: request.to,
          data: request.data,
          value: request.value,
          ...plan,
        });
        const hash = await this.broadcast(signed);
        this.nextNonce = chain.nonce + 1n;
        return { hash };
      }
    );
  }

  /** Reads nonce, balance, base fee and tip; estimates gas unless the app supplied it or it was estimated before. */
  private async readChain(
    request: TemporaryWalletTransactionRequest,
    knownGas?: bigint
  ): Promise<TemporaryWalletChainState> {
    const from = this.account;
    const presetGas = request.gas ?? knownGas;
    const call = { from, to: request.to, data: request.data, value: toQuantity(request.value) };
    const [nonceValue, balanceValue, block, tip, estimate] = await Promise.all([
      this.rpc('eth_getTransactionCount', [from, 'pending']),
      this.rpc('eth_getBalance', [from, 'latest']),
      this.rpc('eth_getBlockByNumber', ['latest', false]),
      this.priorityFee(),
      presetGas === undefined ? this.rpc('eth_estimateGas', [call]) : Promise.resolve(undefined),
    ]);
    const gas = presetGas ?? rpcQuantity(estimate, 'gas estimate');
    if (gas < MIN_GAS || gas > MAX_GAS) throw invalidParams('Invalid gas');
    const pendingNonce = rpcQuantity(nonceValue, 'nonce');
    return {
      nonce: this.nextNonce !== null && this.nextNonce > pendingNonce ? this.nextNonce : pendingNonce,
      balance: rpcQuantity(balanceValue, 'balance'),
      baseFee: rpcQuantity((block as { baseFeePerGas?: unknown } | null)?.baseFeePerGas, 'base fee'),
      tip,
      gas,
    };
  }

  /** Median tip of recent blocks (some endpoints suggest 0, which can leave a transaction waiting), bounded. */
  private async priorityFee(): Promise<bigint> {
    const clamp = (tip: bigint) =>
      tip < TEMPORARY_WALLET_MIN_TIP
        ? TEMPORARY_WALLET_MIN_TIP
        : tip > TEMPORARY_WALLET_MAX_TIP
          ? TEMPORARY_WALLET_MAX_TIP
          : tip;
    try {
      const history = await this.rpc('eth_feeHistory', ['0xa', 'latest', [50]]);
      const rewards = (Array.isArray(history?.reward) ? history.reward : [])
        .map((entry: unknown) => (Array.isArray(entry) ? rpcQuantity(entry[0], 'tip') : null))
        .filter((tip: bigint | null): tip is bigint => tip !== null)
        .sort((a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0));
      if (rewards.length) return clamp(rewards[Math.floor(rewards.length / 2)]);
    } catch {
      // Fall back to the endpoint's own suggestion.
    }
    try {
      return clamp(rpcQuantity(await this.rpc('eth_maxPriorityFeePerGas', []), 'tip'));
    } catch {
      return TEMPORARY_WALLET_DEFAULT_TIP;
    }
  }

  /** Broadcasts and returns the locally computed hash; "already known" means an earlier attempt got through. */
  private async broadcast(signed: string): Promise<string> {
    const hash = Transaction.from(signed).hash!;
    try {
      const result = await this.rpc('eth_sendRawTransaction', [signed]);
      if (typeof result !== 'string' || result.toLowerCase() !== hash.toLowerCase()) {
        throw providerError(
          TemporaryWalletErrorCode.Internal,
          'The Ethereum network returned an unexpected transaction hash.'
        );
      }
    } catch (error) {
      if (/already known|known transaction|already imported/i.test(String((error as Error)?.message ?? '')))
        return hash;
      throw error;
    }
    return hash;
  }
}

let current: {
  wallet: HDNodeWallet;
  provider: TemporaryEthereumProvider;
  createdAt: number;
  /** SORA account whose purchases this wallet carries; set for wallets saved in the browser vault. */
  owner?: string;
} | null = null;
let rpc: TemporaryWalletRpc = createTemporaryWalletRpc();
let approve: Approve = requestTemporaryWalletApproval;
let vault: TemporaryWalletVaultStore = createTemporaryWalletVaultStore();
let opening: { owner: string; create: boolean; promise: Promise<TemporaryPurchaseWallet | null> } | null = null;

/** The purchase wallet of a SORA account, and whether it is saved in this browser. */
export interface TemporaryPurchaseWallet {
  backup: TemporaryWalletBackup;
  /** False when the browser refused storage: the wallet then lives in page memory only. */
  persisted: boolean;
  /** True when it was reopened from the browser vault rather than made now. */
  restored: boolean;
}

/** A purchase wallet is saved for this account but cannot be decrypted; it is never overwritten automatically. */
export class TemporaryWalletVaultError extends Error {
  constructor() {
    super('The saved temporary wallet cannot be opened');
    this.name = 'TemporaryWalletVaultError';
  }
}

const ICON =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#f8087b"/>' +
      '<path d="M8 11.5A2.5 2.5 0 0 1 10.5 9H22v3H10.5a.5.5 0 0 0 0 1H24v10H10.5A2.5 2.5 0 0 1 8 20.5z" fill="#fff"/>' +
      '<circle cx="20" cy="18" r="1.6" fill="#f8087b"/></svg>'
  );

/** Connect with `web3Store.selectEvmProvider(TemporaryWalletAppProvider)` after the user saved the phrase. */
export const TemporaryWalletAppProvider: AppEIPProvider = {
  rdns: 'io.polkaswap.temporary-wallet',
  uuid: TEMPORARY_WALLET_UUID,
  name: 'Temporary wallet',
  icon: ICON,
  installed: true,
  getProvider: async () => current?.provider ?? null,
};

function open(wallet: HDNodeWallet, owner?: string, persisted = false, createdAt = Date.now()): TemporaryWalletBackup {
  current = { wallet, provider: new TemporaryEthereumProvider(wallet, rpc, approve), createdAt, owner };
  setTemporaryWalletAddress(wallet.address, persisted);
  return getTemporaryWalletBackup()!;
}

/** Closes the in-memory wallet without touching the vault, for example when another SORA account takes over. */
function closeInMemory(): void {
  const closing = current;
  if (!closing) return;
  current = null;
  closing.provider.close();
  setTemporaryWalletAddress('');
}

async function openPurchaseWallet(owner: string, create: boolean): Promise<TemporaryPurchaseWallet | null> {
  if (current?.owner === owner && current.wallet.mnemonic) {
    const persisted = await vault
      .read(owner)
      .then((record) => record?.address === current?.wallet.address)
      .catch(() => false);
    return { backup: getTemporaryWalletBackup()!, persisted, restored: false };
  }
  if (current) closeInMemory();
  let record;
  try {
    record = await vault.read(owner);
  } catch {
    record = undefined;
  }
  if (record) {
    let wallet: HDNodeWallet;
    try {
      const phrase = await openTemporaryWalletVault(record, owner);
      wallet = HDNodeWallet.fromPhrase(phrase, undefined, TEMPORARY_WALLET_DERIVATION_PATH);
    } catch {
      throw new TemporaryWalletVaultError();
    }
    if (wallet.address !== record.address) throw new TemporaryWalletVaultError();
    return { backup: open(wallet, owner, true, record.createdAt), persisted: true, restored: true };
  }
  if (!create) return null;
  const wallet = Wallet.createRandom();
  if (wallet.path !== TEMPORARY_WALLET_DERIVATION_PATH || !wallet.mnemonic)
    throw new Error('Unexpected derivation path');
  let persisted = false;
  let createdAt: number | undefined;
  try {
    const sealed = await sealTemporaryWallet(wallet.mnemonic.phrase, wallet.address, owner);
    createdAt = sealed.createdAt;
    await vault.write(sealed);
    persisted = true;
  } catch {
    persisted = false;
  }
  return { backup: open(wallet, owner, persisted, createdAt), persisted, restored: false };
}

/**
 * Opens the purchase wallet of a SORA account: the one saved, encrypted, in this browser, or a new one that is
 * saved at once (see `temporaryWalletVault.ts`). A saved wallet that cannot be decrypted is never replaced:
 * this throws `TemporaryWalletVaultError` so the user can restore it from its recovery phrase instead.
 */
export function openTemporaryPurchaseWallet(owner: string): Promise<TemporaryPurchaseWallet> {
  if (!owner) return Promise.reject(new Error('A SORA account is required'));
  if (opening?.owner === owner && opening.create) return opening.promise as Promise<TemporaryPurchaseWallet>;
  const promise = openPurchaseWallet(owner, true).finally(() => {
    if (opening?.promise === promise) opening = null;
  }) as Promise<TemporaryPurchaseWallet>;
  opening = { owner, create: true, promise };
  return promise;
}

/** Opens the purchase wallet saved for this SORA account, if there is one, without making a new one. */
export function openSavedTemporaryPurchaseWallet(owner: string): Promise<TemporaryPurchaseWallet | null> {
  if (!owner) return Promise.resolve(null);
  if (opening?.owner === owner) return opening.promise;
  const promise = openPurchaseWallet(owner, false).finally(() => {
    if (opening?.promise === promise) opening = null;
  });
  opening = { owner, create: false, promise };
  return promise;
}

/** SORA account of the open purchase wallet, if it is one. */
export function getTemporaryWalletOwner(): string | undefined {
  return current?.owner;
}

/** True while a temporary wallet is open on this page. */
export function hasTemporaryWallet(): boolean {
  return current !== null;
}

/**
 * Makes a new random wallet. Refuses while another one is open, so a wallet holding funds is never replaced
 * by accident: close it first with `forgetTemporaryWallet()`.
 */
export function createTemporaryWallet(): TemporaryWalletBackup {
  if (current) throw new Error('A temporary wallet is already open');
  const wallet = Wallet.createRandom();
  if (wallet.path !== TEMPORARY_WALLET_DERIVATION_PATH) throw new Error('Unexpected derivation path');
  return open(wallet);
}

/** Opens the wallet of a saved recovery phrase. Throws `TemporaryWalletPhraseError` for invalid words. */
export function restoreTemporaryWallet(input: string): TemporaryWalletBackup {
  if (current) throw new Error('A temporary wallet is already open');
  const phrase = normalizeTemporaryWalletPhrase(input);
  if (!phrase) throw new TemporaryWalletPhraseError();
  return open(HDNodeWallet.fromPhrase(phrase, undefined, TEMPORARY_WALLET_DERIVATION_PATH));
}

/** The recovery phrase and address of the open wallet, for the user to save. */
export function getTemporaryWalletBackup(): TemporaryWalletBackup | null {
  if (!current?.wallet.mnemonic) return null;
  return {
    address: current.wallet.address,
    phrase: current.wallet.mnemonic.phrase,
    path: TEMPORARY_WALLET_DERIVATION_PATH,
    createdAt: current.createdAt,
  };
}

/**
 * Deletes the wallet from the page and, for a purchase wallet, from this browser's vault. Listeners (the app's EVM
 * connection) are told there is no account.
 */
export function forgetTemporaryWallet(): void {
  const owner = current?.owner;
  closeInMemory();
  if (owner) void vault.remove(owner).catch(() => undefined);
}

/** Current ETH and ERC-20 balances of the open wallet in base units, read from the public endpoints. */
export async function readTemporaryWalletBalances(
  tokens: readonly string[] = []
): Promise<{ eth: bigint; tokens: bigint[] }> {
  const account = current?.provider.account;
  if (!account) throw new Error('No temporary wallet is open');
  const [eth, ...balances] = await Promise.all([
    rpc('eth_getBalance', [account, 'latest']),
    ...tokens.map((token) =>
      rpc('eth_call', [{ to: getAddress(token), data: ERC20.encodeFunctionData('balanceOf', [account]) }, 'latest'])
    ),
  ]);
  return {
    eth: rpcQuantity(eth, 'balance'),
    tokens: balances.map((value) => BigInt(ERC20.decodeFunctionResult('balanceOf', value)[0])),
  };
}

/** Plain-text backup file. It holds the phrase, so the UI offers it only on the user's explicit download. */
export function formatTemporaryWalletBackupFile(
  backup: TemporaryWalletBackup,
  labels: TemporaryWalletBackupLabels
): string {
  return [
    labels.title,
    `${labels.created}: ${new Date(backup.createdAt).toISOString()}`,
    `${labels.address}: ${backup.address}`,
    `${labels.phrase}: ${backup.phrase}`,
    `${labels.path}: ${backup.path}`,
    '',
    labels.warning,
    labels.help,
    '',
  ].join('\n');
}

/** File name with a short address prefix so several backups can be told apart. */
export function temporaryWalletBackupFileName(address: string): string {
  return `polkaswap-temporary-wallet-${address.slice(2, 8).toLowerCase()}.txt`;
}

/**
 * Test helper: replaces the RPC transport and approval prompt, and closes any open wallet.
 * Should not be used in production code.
 */
export function __setTemporaryWalletDependencies(
  dependencies: { rpc?: TemporaryWalletRpc; approve?: Approve; vault?: TemporaryWalletVaultStore } = {}
): void {
  closeInMemory();
  opening = null;
  rpc = dependencies.rpc ?? createTemporaryWalletRpc();
  approve = dependencies.approve ?? requestTemporaryWalletApproval;
  vault = dependencies.vault ?? createTemporaryWalletVaultStore();
}
