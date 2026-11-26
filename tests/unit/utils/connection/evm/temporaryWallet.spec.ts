// @vitest-environment node
// ethers derives keys with Node crypto under Vitest; jsdom would hand it Buffers from another realm.
import { BrowserProvider, Transaction, Wallet } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __setTemporaryWalletDependencies,
  canReuseTemporaryWalletPlan,
  createTemporaryWallet,
  createTemporaryWalletRpc,
  forgetTemporaryWallet,
  formatTemporaryWalletBackupFile,
  getTemporaryWalletBackup,
  hasTemporaryWallet,
  normalizeTemporaryWalletPhrase,
  parseTemporaryWalletTransaction,
  planTemporaryWalletFees,
  readTemporaryWalletBalances,
  restoreTemporaryWallet,
  TEMPORARY_WALLET_DERIVATION_PATH,
  TEMPORARY_WALLET_MAX_TIP,
  TEMPORARY_WALLET_MIN_TIP,
  TEMPORARY_WALLET_RPC_URLS,
  TemporaryWalletAppProvider,
  temporaryWalletBackupFileName,
  TemporaryWalletPhraseError,
  getTemporaryWalletOwner,
  openSavedTemporaryPurchaseWallet,
  openTemporaryPurchaseWallet,
  TemporaryWalletVaultError,
} from '@/utils/connection/evm/temporaryWallet';
import type {
  TemporaryWalletVaultRecord,
  TemporaryWalletVaultStore,
} from '@/utils/connection/evm/temporaryWalletVault';
import {
  approveTemporaryWalletRequest,
  rejectTemporaryWalletRequest,
  temporaryWalletSession,
} from '@/utils/connection/evm/temporaryWalletSession';

/** Hardhat's public test phrase; its first account is a well-known address that holds nothing on mainnet. */
const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ACCOUNT = ADDRESS.toLowerCase();
const GATEWAY = '0xe7e68d336f90f98d22a479253eafa5f2424acad8';
const GWEI = 1_000_000_000n;
const hex = (value: bigint) => `0x${value.toString(16)}`;

/** Mainnet state the mocked public endpoint reports. */
const chain = {
  nonce: 3n,
  balance: 10n ** 18n,
  baseFee: 10n * GWEI,
  rewards: [GWEI, 2n * GWEI, GWEI / 2n],
  estimate: 100_000n,
  sendRawError: null as null | { code: number; message: string },
  sentHash: null as string | null,
};
const sent: string[] = [];
async function mainnet(method: string, params: unknown[]): Promise<any> {
  switch (method) {
    case 'eth_getTransactionCount':
      return hex(chain.nonce);
    case 'eth_getBalance':
      return hex(chain.balance);
    case 'eth_getBlockByNumber':
      return { number: '0x10', baseFeePerGas: hex(chain.baseFee) };
    case 'eth_feeHistory':
      return { reward: chain.rewards.map((tip) => [hex(tip)]) };
    case 'eth_estimateGas':
      return hex(chain.estimate);
    case 'eth_sendRawTransaction': {
      if (chain.sendRawError) throw Object.assign(new Error(chain.sendRawError.message), chain.sendRawError);
      const raw = params[0] as string;
      sent.push(raw);
      return chain.sentHash ?? Transaction.from(raw).hash;
    }
    default:
      return `result:${method}`;
  }
}
const rpc = vi.fn(mainnet);

async function connectedProvider() {
  restoreTemporaryWallet(PHRASE);
  const provider = await TemporaryWalletAppProvider.getProvider();
  expect(provider).toBeTruthy();
  return provider!;
}

/** Waits until the provider has prepared the figures and opened the approval request. */
async function pendingRequest() {
  await vi.waitFor(() => expect(temporaryWalletSession.request).not.toBeNull());
  return temporaryWalletSession.request!;
}

const appTransaction = (extra: Record<string, unknown> = {}) => ({
  from: ACCOUNT,
  to: GATEWAY,
  data: '0x1234',
  value: hex(5n * 10n ** 15n),
  gas: hex(200_000n),
  chainId: '0x1',
  ...extra,
});

beforeEach(() => {
  Object.assign(chain, {
    nonce: 3n,
    balance: 10n ** 18n,
    baseFee: 10n * GWEI,
    rewards: [GWEI, 2n * GWEI, GWEI / 2n],
    estimate: 100_000n,
    sendRawError: null,
    sentHash: null,
  });
  sent.length = 0;
  rpc.mockReset();
  rpc.mockImplementation(mainnet);
  __setTemporaryWalletDependencies({ rpc });
});

afterEach(() => {
  vi.restoreAllMocks();
  const pending = temporaryWalletSession.request;
  if (pending && !pending.busy) rejectTemporaryWalletRequest(pending.id);
  __setTemporaryWalletDependencies();
});

describe('temporary wallet keys', () => {
  it('creates a standard 12-word wallet that the same phrase restores, and refuses to replace an open one', () => {
    const created = createTemporaryWallet();
    expect(created.phrase.split(' ')).toHaveLength(12);
    expect(normalizeTemporaryWalletPhrase(created.phrase)).toBe(created.phrase);
    expect(created.path).toBe(TEMPORARY_WALLET_DERIVATION_PATH);
    expect(Wallet.fromPhrase(created.phrase).address).toBe(created.address);
    expect(temporaryWalletSession.address).toBe(created.address.toLowerCase());
    expect(() => createTemporaryWallet()).toThrow('already open');
    expect(() => restoreTemporaryWallet(PHRASE)).toThrow('already open');

    forgetTemporaryWallet();
    expect(hasTemporaryWallet()).toBe(false);
    expect(getTemporaryWalletBackup()).toBeNull();
    expect(temporaryWalletSession.address).toBe('');
    expect(restoreTemporaryWallet(created.phrase).address).toBe(created.address);
  });

  it('restores the known test vector and accepts messy spacing and capitals', () => {
    expect(restoreTemporaryWallet(`  ${PHRASE.toUpperCase().replace(/ /g, ' \n\t ')}  `).address).toBe(ADDRESS);
    expect(getTemporaryWalletBackup()).toMatchObject({ address: ADDRESS, phrase: PHRASE });
  });

  it('rejects phrases with a bad checksum, unknown words, a wrong length or oversized input', () => {
    expect(normalizeTemporaryWalletPhrase(PHRASE.replace(/junk$/, 'test'))).toBeNull();
    expect(normalizeTemporaryWalletPhrase(PHRASE.replace(/^test/, 'tset'))).toBeNull();
    expect(normalizeTemporaryWalletPhrase('test test test')).toBeNull();
    expect(normalizeTemporaryWalletPhrase(`${PHRASE} `.repeat(100))).toBeNull();
    expect(normalizeTemporaryWalletPhrase(42 as unknown as string)).toBeNull();
    expect(() => restoreTemporaryWallet('not a phrase')).toThrow(TemporaryWalletPhraseError);
    expect(hasTemporaryWallet()).toBe(false);
  });

  it('formats a backup file with the phrase, address and path', () => {
    const backup = restoreTemporaryWallet(PHRASE);
    const text = formatTemporaryWalletBackupFile(
      { ...backup, createdAt: Date.UTC(2026, 9, 9, 12) },
      { title: 'T', created: 'C', address: 'A', phrase: 'P', path: 'D', warning: 'W', help: 'H' }
    );
    expect(text).toBe(`T\nC: 2026-10-09T12:00:00.000Z\nA: ${ADDRESS}\nP: ${PHRASE}\nD: m/44'/60'/0'/0/0\n\nW\nH\n`);
    expect(temporaryWalletBackupFileName(ADDRESS)).toBe('polkaswap-temporary-wallet-f39fd6.txt');
  });
});

describe('temporary wallet EIP-1193 provider', () => {
  it('reports one lower-case mainnet account in the shapes the app connection expects', async () => {
    const provider = await connectedProvider();
    expect(await provider.request({ method: 'eth_chainId' })).toBe('0x1');
    expect(await provider.request({ method: 'net_version' })).toBe('1');
    expect(await provider.request({ method: 'eth_requestAccounts' })).toEqual([ACCOUNT]);
    expect(await provider.request({ method: 'eth_accounts' })).toEqual([ACCOUNT]);
    expect(await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })).toEqual([
      { parentCapability: 'eth_accounts', caveats: [{ type: 'restrictReturnedAccounts', value: [ACCOUNT] }] },
    ]);
    expect(await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })).toBeNull();
    expect(await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] })).toBeNull();
    await expect(
      provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] })
    ).rejects.toMatchObject({ code: 4901 });
    expect(await provider.request({ method: 'wallet_watchAsset', params: {} as never })).toBe(false);
    expect(TemporaryWalletAppProvider.uuid).toBe('polkaswap-temporary-wallet');
    expect(TemporaryWalletAppProvider.icon).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('forwards only read methods to the public endpoint and refuses signing methods', async () => {
    const provider = await connectedProvider();
    const call = [{ to: GATEWAY, data: '0x' }, 'latest'];
    expect(await provider.request({ method: 'eth_call', params: call })).toBe('result:eth_call');
    expect(rpc).toHaveBeenLastCalledWith('eth_call', call);
    for (const method of [
      'personal_sign',
      'eth_sign',
      'eth_signTypedData_v4',
      'eth_signTransaction',
      'eth_sendRawTransaction',
      'wallet_addEthereumChain',
      'debug_traceCall',
      'eth_subscribe',
    ]) {
      await expect(provider.request({ method, params: [] })).rejects.toMatchObject({ code: 4200 });
    }
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('signs an approved transaction with its own nonce and fees, broadcasts it and returns its hash', async () => {
    const provider = await connectedProvider();
    const result = provider.request({
      method: 'eth_sendTransaction',
      params: [appTransaction({ nonce: '0x99', gasPrice: '0x1' })],
    });
    const request = await pendingRequest();
    // Tip: median of the recent 1, 2 and 0.5 gwei tips. Fee cap: 2 × 10 gwei base fee + 1 gwei.
    expect(request).toMatchObject({
      from: ACCOUNT,
      to: '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8',
      value: (5n * 10n ** 15n).toString(),
      data: '0x1234',
      gasLimit: '250000',
      maxFeePerGas: (21n * GWEI).toString(),
      estimatedFee: (200_000n * 11n * GWEI).toString(),
      maxFee: (250_000n * 21n * GWEI).toString(),
      feeIncreased: false,
      busy: false,
    });
    expect(sent).toHaveLength(0);

    await approveTemporaryWalletRequest(request.id);
    const hash = await result;
    expect(sent).toHaveLength(1);
    const tx = Transaction.from(sent[0]);
    expect(hash).toBe(tx.hash);
    expect(tx.from).toBe(ADDRESS);
    expect(tx).toMatchObject({
      type: 2,
      chainId: 1n,
      nonce: 3,
      to: '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8',
      data: '0x1234',
      value: 5n * 10n ** 15n,
      gasLimit: 250_000n,
      maxFeePerGas: 21n * GWEI,
      maxPriorityFeePerGas: GWEI,
    });
    expect(tx.authorizationList).toBeNull();
    expect(temporaryWalletSession.request).toBeNull();
  });

  it('estimates gas when the request has none', async () => {
    const provider = await connectedProvider();
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction({ gas: undefined })] });
    const request = await pendingRequest();
    expect(rpc).toHaveBeenCalledWith('eth_estimateGas', [
      { from: ACCOUNT, to: '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8', data: '0x1234', value: hex(5n * 10n ** 15n) },
    ]);
    expect(request.gasLimit).toBe('125000');
    await approveTemporaryWalletRequest(request.id);
    await result;
  });

  it('sends nothing when the user rejects', async () => {
    const provider = await connectedProvider();
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    rejectTemporaryWalletRequest((await pendingRequest()).id);
    await expect(result).rejects.toMatchObject({ code: 4001 });
    expect(sent).toHaveLength(0);
  });

  it('refuses another sender, other chains, contract creation and blob or delegation transactions', () => {
    const parse = (extra: Record<string, unknown>) => () =>
      parseTemporaryWalletTransaction(appTransaction(extra), ACCOUNT);
    expect(parse({ from: '0x0000000000000000000000000000000000000001' })).toThrow(
      expect.objectContaining({ code: 4100 })
    );
    expect(parse({ chainId: '0x38' })).toThrow(expect.objectContaining({ code: 4901 }));
    expect(parse({ to: undefined })).toThrow(expect.objectContaining({ code: 4200 }));
    expect(parse({ to: '0x0000000000000000000000000000000000000000' })).toThrow(
      expect.objectContaining({ code: -32602 })
    );
    expect(parse({ authorizationList: [{}] })).toThrow(expect.objectContaining({ code: 4200 }));
    expect(parse({ blobVersionedHashes: ['0x01'] })).toThrow(expect.objectContaining({ code: 4200 }));
    expect(parse({ type: '0x4' })).toThrow(expect.objectContaining({ code: 4200 }));
    expect(parse({ data: '0x123' })).toThrow(expect.objectContaining({ code: -32602 }));
    expect(parse({ value: '12' })).toThrow(expect.objectContaining({ code: -32602 }));
    expect(parse({ gas: '0x1' })).toThrow(expect.objectContaining({ code: -32602 }));
    expect(parseTemporaryWalletTransaction({ to: GATEWAY }, ACCOUNT)).toEqual({
      to: '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8',
      data: '0x',
      value: 0n,
      gas: undefined,
    });
  });

  it('reports a shortfall the way nodes do, so ethers maps it to INSUFFICIENT_FUNDS', async () => {
    chain.balance = 5n * 10n ** 15n;
    const provider = await connectedProvider();
    await expect(provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] })).rejects.toMatchObject(
      {
        code: -32000,
        message: 'insufficient funds for gas * price + value',
      }
    );
    expect(temporaryWalletSession.request).toBeNull();
  });

  it('keeps the approved fee cap when the base fee moves a little', async () => {
    const provider = await connectedProvider();
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    const request = await pendingRequest();
    chain.baseFee = 11n * GWEI;
    chain.rewards = [3n * GWEI];
    await approveTemporaryWalletRequest(request.id);
    await result;
    expect(Transaction.from(sent[0])).toMatchObject({
      maxFeePerGas: 21n * GWEI,
      maxPriorityFeePerGas: GWEI,
      gasLimit: 250_000n,
    });
  });

  it('asks again with the new figures when the approved cap can no longer get the transaction included', async () => {
    const provider = await connectedProvider();
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    const request = await pendingRequest();
    chain.baseFee = 20n * GWEI;
    await approveTemporaryWalletRequest(request.id);
    expect(sent).toHaveLength(0);
    expect(temporaryWalletSession.request).toMatchObject({
      id: request.id,
      feeIncreased: true,
      busy: false,
      maxFeePerGas: (41n * GWEI).toString(),
      maxFee: (250_000n * 41n * GWEI).toString(),
    });
    await approveTemporaryWalletRequest(request.id);
    await result;
    expect(Transaction.from(sent[0]).maxFeePerGas).toBe(41n * GWEI);
  });

  it('uses the next nonce when the endpoint has not seen the previous broadcast yet', async () => {
    const provider = await connectedProvider();
    for (const expected of [3, 4]) {
      const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
      await approveTemporaryWalletRequest((await pendingRequest()).id);
      await result;
      expect(Transaction.from(sent.at(-1)!).nonce).toBe(expected);
    }
    chain.nonce = 9n;
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    await approveTemporaryWalletRequest((await pendingRequest()).id);
    await result;
    expect(Transaction.from(sent.at(-1)!).nonce).toBe(9);
  });

  it('treats "already known" as delivered and rejects an unexpected hash', async () => {
    const provider = await connectedProvider();
    chain.sendRawError = { code: -32000, message: 'already known' };
    let result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    await approveTemporaryWalletRequest((await pendingRequest()).id);
    await expect(result).resolves.toMatch(/^0x[0-9a-f]{64}$/);

    chain.sendRawError = null;
    chain.sentHash = `0x${'ab'.repeat(32)}`;
    result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    await approveTemporaryWalletRequest((await pendingRequest()).id);
    await expect(result).rejects.toMatchObject({ code: -32603 });
  });

  it('closing the wallet rejects a waiting request, empties the accounts and tells listeners', async () => {
    const provider = (await connectedProvider()) as Awaited<ReturnType<typeof connectedProvider>> & {
      on: (event: string, listener: (accounts: string[]) => void) => void;
    };
    const accountsChanged = vi.fn();
    provider.on('accountsChanged', accountsChanged);
    const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
    await pendingRequest();
    forgetTemporaryWallet();
    await expect(result).rejects.toMatchObject({ code: 4900 });
    expect(accountsChanged).toHaveBeenCalledWith([]);
    expect(await provider.request({ method: 'eth_accounts' })).toEqual([]);
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toMatchObject({ code: 4900 });
    expect(await TemporaryWalletAppProvider.getProvider()).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it('reads ETH and token balances of the open wallet', async () => {
    restoreTemporaryWallet(PHRASE);
    rpc
      .mockImplementationOnce(async () => hex(7n))
      .mockImplementationOnce(async () => `0x${42n.toString(16).padStart(64, '0')}`);
    await expect(readTemporaryWalletBalances(['0x6B175474E89094C44Da98b954EedeAC495271d0F'])).resolves.toEqual({
      eth: 7n,
      tokens: [42n],
    });
    expect(rpc).toHaveBeenLastCalledWith('eth_call', [
      {
        to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        data: `0x70a08231${ACCOUNT.slice(2).padStart(64, '0')}`,
      },
      'latest',
    ]);
  });
});

describe('temporary wallet with the ethers BrowserProvider used by the app', () => {
  it('sends a transaction through JsonRpcSigner and maps rejections and shortfalls to ethers codes', async () => {
    const eip1193 = await connectedProvider();
    const browser = new BrowserProvider(eip1193, 'any');
    rpc.mockImplementation(async (method: string, params: unknown[]) => {
      if (method === 'eth_blockNumber') return '0x10';
      if (method === 'eth_getTransactionByHash') {
        const tx = Transaction.from(sent.at(-1)!);
        return {
          hash: tx.hash,
          type: '0x2',
          chainId: '0x1',
          nonce: hex(BigInt(tx.nonce)),
          from: tx.from,
          to: tx.to,
          value: hex(tx.value),
          input: tx.data,
          gas: hex(tx.gasLimit),
          maxFeePerGas: hex(tx.maxFeePerGas!),
          maxPriorityFeePerGas: hex(tx.maxPriorityFeePerGas!),
          accessList: [],
          r: tx.signature!.r,
          s: tx.signature!.s,
          yParity: hex(BigInt(tx.signature!.yParity)),
          v: hex(BigInt(tx.signature!.yParity)),
          blockHash: null,
          blockNumber: null,
          transactionIndex: null,
        };
      }
      if (method === 'eth_estimateGas') return hex(21_000n);
      if (method === 'eth_getTransactionCount') return hex(chain.nonce);
      if (method === 'eth_getBalance') return hex(chain.balance);
      if (method === 'eth_getBlockByNumber') return { number: '0x10', baseFeePerGas: hex(chain.baseFee) };
      if (method === 'eth_feeHistory') return { reward: [[hex(GWEI)]] };
      if (method === 'eth_sendRawTransaction') {
        sent.push(params[0] as string);
        return Transaction.from(params[0] as string).hash;
      }
      throw new Error(`unexpected ${method}`);
    });
    const signer = await browser.getSigner();
    expect(await signer.getAddress()).toBe(ADDRESS);
    expect((await browser.getNetwork()).chainId).toBe(1n);

    const sending = signer.sendTransaction({ to: GATEWAY, value: 1n });
    await approveTemporaryWalletRequest((await pendingRequest()).id);
    const response = await sending;
    expect(response.hash).toBe(Transaction.from(sent[0]).hash);
    expect(Transaction.from(sent[0])).toMatchObject({ gasLimit: 26_250n, value: 1n, from: ADDRESS });

    const rejected = signer.sendTransaction({ to: GATEWAY, value: 1n });
    rejectTemporaryWalletRequest((await pendingRequest()).id);
    await expect(rejected).rejects.toMatchObject({ code: 'ACTION_REJECTED' });

    chain.balance = 0n;
    await expect(signer.sendTransaction({ to: GATEWAY, value: 1n })).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
    });
  });
});

describe('temporary wallet fee planning', () => {
  const base = { value: 10n ** 16n, gas: 100_000n, baseFee: 10n * GWEI, priorityFee: GWEI };

  it('adds 25 % gas at twice the base fee plus tip when the balance covers it', () => {
    expect(planTemporaryWalletFees({ ...base, balance: 10n ** 16n + 125_000n * 21n * GWEI })).toEqual({
      gasLimit: 125_000n,
      maxFeePerGas: 21n * GWEI,
      maxPriorityFeePerGas: GWEI,
    });
  });

  it('falls back to the plain estimate, then to the highest affordable fee cap that survives one fee rise', () => {
    expect(planTemporaryWalletFees({ ...base, balance: 10n ** 16n + 125_000n * 21n * GWEI - 1n })).toEqual({
      gasLimit: 100_000n,
      maxFeePerGas: 21n * GWEI,
      maxPriorityFeePerGas: GWEI,
    });
    // 1.125 × 10 gwei + 1 gwei = 12.25 gwei is the lowest cap still accepted.
    expect(planTemporaryWalletFees({ ...base, balance: 10n ** 16n + 100_000n * 12_250_000_000n })).toEqual({
      gasLimit: 100_000n,
      maxFeePerGas: 12_250_000_000n,
      maxPriorityFeePerGas: GWEI,
    });
    expect(planTemporaryWalletFees({ ...base, balance: 10n ** 16n + 100_000n * 12_250_000_000n - 1n })).toBeNull();
    expect(planTemporaryWalletFees({ ...base, balance: 10n ** 16n })).toBeNull();
    expect(planTemporaryWalletFees({ ...base, gas: 0n, balance: 10n ** 18n })).toBeNull();
  });

  it('reuses an approved plan only while its cap covers a fee rise and the balance covers its cost', () => {
    const plan = { gasLimit: 125_000n, maxFeePerGas: 21n * GWEI, maxPriorityFeePerGas: GWEI };
    const enough = 10n ** 16n + 125_000n * 21n * GWEI;
    expect(canReuseTemporaryWalletPlan(plan, 10n ** 16n, { baseFee: 17n * GWEI, balance: enough })).toBe(true);
    expect(canReuseTemporaryWalletPlan(plan, 10n ** 16n, { baseFee: 18n * GWEI, balance: enough })).toBe(false);
    expect(canReuseTemporaryWalletPlan(plan, 10n ** 16n, { baseFee: 10n * GWEI, balance: enough - 1n })).toBe(false);
  });

  it('bounds the tip suggested by fee history', async () => {
    const provider = await connectedProvider();
    for (const [rewards, expected] of [
      [[0n, 0n, 0n], TEMPORARY_WALLET_MIN_TIP],
      [[50n * GWEI], TEMPORARY_WALLET_MAX_TIP],
    ] as const) {
      chain.rewards = [...rewards];
      const result = provider.request({ method: 'eth_sendTransaction', params: [appTransaction()] });
      const request = await pendingRequest();
      expect(BigInt(request.maxFeePerGas)).toBe(2n * chain.baseFee + expected);
      rejectTemporaryWalletRequest(request.id);
      await expect(result).rejects.toMatchObject({ code: 4001 });
    }
  });
});

describe('temporary wallet RPC transport', () => {
  const okReply = (body: unknown, status = 200) =>
    ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as Response;

  it('posts plain JSON-RPC without credentials or redirects and returns the result', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      okReply({ jsonrpc: '2.0', id: JSON.parse(String(init.body)).id, result: '0x1' })
    );
    const call = createTemporaryWalletRpc(['https://a.example'], fetchMock as unknown as typeof fetch);
    await expect(call('eth_chainId', [])).resolves.toBe('0x1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://a.example');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
    expect(JSON.parse(String(init.body))).toMatchObject({ jsonrpc: '2.0', method: 'eth_chainId', params: [] });
    expect(TEMPORARY_WALLET_RPC_URLS[0]).toBe('https://ethereum-rpc.publicnode.com');
  });

  it('moves to the next endpoint on transport failures, bad replies and rate limits only', async () => {
    const replies = [
      () => Promise.reject(new TypeError('network')),
      () => Promise.resolve(okReply({}, 503)),
      (id: number) => Promise.resolve(okReply({ jsonrpc: '2.0', id: id + 1, result: '0xbad' })),
      (id: number) => Promise.resolve(okReply({ jsonrpc: '2.0', id, error: { code: -32005, message: 'limit' } })),
      (id: number) => Promise.resolve(okReply({ jsonrpc: '2.0', id, result: '0x2' })),
    ];
    const fetchMock = vi.fn((_url: string, init: RequestInit) => replies.shift()!(JSON.parse(String(init.body)).id));
    const urls = [
      'https://1.example',
      'https://2.example',
      'https://3.example',
      'https://4.example',
      'https://5.example',
    ];
    await expect(
      createTemporaryWalletRpc(urls, fetchMock as unknown as typeof fetch)('eth_blockNumber', [])
    ).resolves.toBe('0x2');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(urls);
  });

  it('returns node errors such as insufficient funds without trying another endpoint', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      okReply({
        jsonrpc: '2.0',
        id: JSON.parse(String(init.body)).id,
        error: { code: -32000, message: 'insufficient funds' },
      })
    );
    const call = createTemporaryWalletRpc(
      ['https://a.example', 'https://b.example'],
      fetchMock as unknown as typeof fetch
    );
    await expect(call('eth_sendRawTransaction', ['0x00'])).rejects.toMatchObject({
      code: -32000,
      message: 'insufficient funds',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails with an internal error when no endpoint answers', async () => {
    const fetchMock = vi.fn(async () => okReply({}, 500));
    await expect(
      createTemporaryWalletRpc(['https://a.example'], fetchMock as unknown as typeof fetch)('eth_blockNumber', [])
    ).rejects.toMatchObject({ code: -32603 });
  });
});

/** In-memory vault that clones like IndexedDB does. */
function memoryVault(options: { failWrites?: boolean } = {}) {
  const records = new Map<string, TemporaryWalletVaultRecord>();
  const store: TemporaryWalletVaultStore = {
    read: async (owner) => (records.has(owner) ? structuredClone(records.get(owner)) : undefined),
    write: async (record) => {
      if (options.failWrites) throw new Error('QuotaExceededError');
      records.set(record.owner, structuredClone(record));
    },
    remove: async (owner) => {
      records.delete(owner);
    },
  };
  return { store, records };
}

describe('temporary purchase wallet in the browser vault', () => {
  const OWNER_A = 'cnTQ1kbv7PBNNQrEb1tZpmK7hZnSqP2ZzVbT9u4FjM4hYWYmt';
  const OWNER_B = 'cnVkoGs3rEMqLqY27c2nfVXJRGdzNJk2ns78DcqtppaSRe8qm';

  it('saves a new wallet encrypted and reopens the same one after a reload', async () => {
    const vault = memoryVault();
    const createdAt = 1_700_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(createdAt);
    const write = vault.store.write;
    vault.store.write = async (record) => {
      await write(record);
      clock.mockReturnValue(createdAt + 100);
    };
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    const first = await openTemporaryPurchaseWallet(OWNER_A);
    expect(first.backup.createdAt).toBe(createdAt);
    expect(first).toMatchObject({ persisted: true, restored: false });
    expect(temporaryWalletSession).toMatchObject({ address: first.backup.address.toLowerCase(), persisted: true });
    expect(getTemporaryWalletOwner()).toBe(OWNER_A);
    expect(vault.records.get(OWNER_A)?.address).toBe(first.backup.address);
    expect(JSON.stringify([...new Uint8Array(vault.records.get(OWNER_A)!.ciphertext)])).not.toContain('junk');
    expect((await openTemporaryPurchaseWallet(OWNER_A)).backup.address).toBe(first.backup.address);

    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    expect(hasTemporaryWallet()).toBe(false);
    const reopened = await openTemporaryPurchaseWallet(OWNER_A);
    expect(reopened).toMatchObject({ persisted: true, restored: true });
    expect(reopened.backup).toEqual(first.backup);
  });

  it('opens only an existing saved wallet when asked not to make one', async () => {
    const vault = memoryVault();
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    expect(await openSavedTemporaryPurchaseWallet(OWNER_A)).toBeNull();
    expect(hasTemporaryWallet()).toBe(false);
    expect(vault.records.size).toBe(0);
    const made = await openTemporaryPurchaseWallet(OWNER_A);
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    expect((await openSavedTemporaryPurchaseWallet(OWNER_A))?.backup.address).toBe(made.backup.address);
  });

  it('keeps one wallet per SORA account and switches between them', async () => {
    const vault = memoryVault();
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    const a = await openTemporaryPurchaseWallet(OWNER_A);
    const b = await openTemporaryPurchaseWallet(OWNER_B);
    expect(b.backup.address).not.toBe(a.backup.address);
    expect(getTemporaryWalletOwner()).toBe(OWNER_B);
    expect((await openTemporaryPurchaseWallet(OWNER_A)).backup.address).toBe(a.backup.address);
    expect([...vault.records.keys()].sort()).toEqual([OWNER_A, OWNER_B].sort());
  });

  it('shares one opening between concurrent callers', async () => {
    const vault = memoryVault();
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    const [one, two] = await Promise.all([openTemporaryPurchaseWallet(OWNER_A), openTemporaryPurchaseWallet(OWNER_A)]);
    expect(one.backup.address).toBe(two.backup.address);
    expect(vault.records.size).toBe(1);
  });

  it('falls back to page memory when the browser refuses storage', async () => {
    __setTemporaryWalletDependencies({ rpc, vault: memoryVault({ failWrites: true }).store });
    const wallet = await openTemporaryPurchaseWallet(OWNER_A);
    expect(wallet).toMatchObject({ persisted: false, restored: false });
    expect(temporaryWalletSession.persisted).toBe(false);
  });

  it('never replaces a saved wallet it cannot decrypt', async () => {
    const vault = memoryVault();
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    const saved = await openTemporaryPurchaseWallet(OWNER_A);
    const record = vault.records.get(OWNER_A)!;
    const broken = new Uint8Array(record.ciphertext.slice(0));
    broken[0] ^= 1;
    vault.records.set(OWNER_A, { ...record, ciphertext: broken.buffer });
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    await expect(openTemporaryPurchaseWallet(OWNER_A)).rejects.toBeInstanceOf(TemporaryWalletVaultError);
    expect(vault.records.get(OWNER_A)?.address).toBe(saved.backup.address);
    expect(hasTemporaryWallet()).toBe(false);
  });

  it('deletes the saved wallet when it is forgotten', async () => {
    const vault = memoryVault();
    __setTemporaryWalletDependencies({ rpc, vault: vault.store });
    await openTemporaryPurchaseWallet(OWNER_A);
    forgetTemporaryWallet();
    await vi.waitFor(() => expect(vault.records.has(OWNER_A)).toBe(false));
    expect(temporaryWalletSession).toMatchObject({ address: '', persisted: false });
  });
});
