import { FPNumber } from '@sora-substrate/sdk';
import { isGetTsTransactionReference } from './getTsPlan';
import { TONSWAP_CONVERSION_CONTRACTS } from './tonswapConversion';

export const GET_TS_ETHEREUM_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
export const GET_TS_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const GET_TS_CONVERSION_PROGRESS_TIMEOUT_MS = 15_000;
export interface GetTsConversionProgress {
  state: 'idle' | 'unavailable' | 'pending' | 'received' | 'failed';
  reference?: string;
  /** Exact canonical DAI credited minus debited to this recipient by this receipt alone. */
  amount?: string;
  blockHash?: string;
  blockNumber?: number;
}
export interface GetTsConversionLog {
  address: string;
  topics: readonly string[];
  data: string;
  index: number;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  removed?: boolean;
}
export interface GetTsConversionReceipt {
  hash: string;
  from: string;
  to: string | null;
  blockHash: string;
  blockNumber: number;
  status: number | null;
  logs: readonly GetTsConversionLog[];
}
export interface GetTsConversionTransaction {
  hash: string;
  from: string;
  to: string | null;
  chainId: bigint;
  blockHash: string | null;
  blockNumber: number | null;
}
/** Structural subset of ethers Provider; none of these methods connects a wallet or requests signing. */
export interface GetTsConversionReadClient {
  getNetwork(): Promise<{ chainId: bigint }>;
  send(method: string, params: unknown[]): Promise<unknown>;
  getTransaction(hash: string): Promise<GetTsConversionTransaction | null>;
  getTransactionReceipt(hash: string): Promise<GetTsConversionReceipt | null>;
  getBlock(height: number): Promise<{ hash: string | null; number: number } | null>;
  getBlockNumber(): Promise<number>;
}
const address = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value);
const same = (a: unknown, b: string): boolean => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
const height = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;

/** Decodes only bounded, uniquely indexed canonical DAI Transfer logs from this exact transaction and block. */
export function getTsConversionReceiptAmount(receipt: GetTsConversionReceipt, account: string): string | null {
  if (
    !address(account) ||
    !isGetTsTransactionReference(receipt.hash) ||
    !isGetTsTransactionReference(receipt.blockHash) ||
    !height(receipt.blockNumber) ||
    receipt.status !== 1 ||
    !Array.isArray(receipt.logs) ||
    receipt.logs.length > 2048
  )
    return null;
  let net = 0n;
  const indexes = new Set<number>();
  for (const log of receipt.logs) {
    if (
      !log ||
      !address(log.address) ||
      !Number.isSafeInteger(log.index) ||
      log.index < 0 ||
      indexes.has(log.index) ||
      log.removed === true ||
      !same(log.transactionHash, receipt.hash) ||
      !same(log.blockHash, receipt.blockHash) ||
      log.blockNumber !== receipt.blockNumber ||
      !Array.isArray(log.topics) ||
      log.topics.length > 4 ||
      log.topics.some((topic) => typeof topic !== 'string' || !/^0x[0-9a-f]{64}$/i.test(topic)) ||
      typeof log.data !== 'string' ||
      log.data.length > 8194 ||
      !/^0x(?:[0-9a-f]{2})*$/i.test(log.data)
    )
      return null;
    indexes.add(log.index);
    if (!same(log.address, GET_TS_ETHEREUM_DAI) || !same(log.topics[0], GET_TS_TRANSFER_TOPIC)) continue;
    if (
      log.topics.length !== 3 ||
      log.data.length !== 66 ||
      !/^0x0{24}[0-9a-f]{40}$/i.test(log.topics[1]) ||
      !/^0x0{24}[0-9a-f]{40}$/i.test(log.topics[2])
    )
      return null;
    const amount = BigInt(log.data);
    const from = `0x${log.topics[1].slice(-40)}`;
    const to = `0x${log.topics[2].slice(-40)}`;
    if (same(to, account)) net += amount;
    if (same(from, account)) net -= amount;
  }
  if (net <= 0n || net >= 1n << 256n) return null;
  return FPNumber.fromCodecValue(net.toString(), 18).toString();
}

/**
 * Revalidates one tracked Ethereum conversion with the existing one-confirmation policy.
 * A balance, saved success flag, replacement transaction, or external TON transfer is never evidence here.
 */
export async function readGetTsConversionProgress(
  client: GetTsConversionReadClient,
  reference: string,
  account: string,
  isCurrent: () => boolean
): Promise<GetTsConversionProgress> {
  if (!reference) return { state: 'idle' };
  const base = { reference };
  const read = async <T>(action: () => Promise<T>): Promise<T> => {
    if (!isCurrent()) throw new Error('context');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), GET_TS_CONVERSION_PROGRESS_TIMEOUT_MS);
        }),
      ]);
      if (!isCurrent()) throw new Error('context');
      return result;
    } finally {
      clearTimeout(timer);
    }
  };
  const checkWallet = async (): Promise<void> => {
    const [chain, accounts] = await Promise.all([
      read(() => client.send('eth_chainId', [])),
      read(() => client.send('eth_accounts', [])),
    ]);
    if (chain !== '0x1' || !Array.isArray(accounts) || !same(accounts[0], account)) throw new Error('wallet');
  };
  try {
    if (!isGetTsTransactionReference(reference) || !address(account)) throw new Error('input');
    if ((await read(() => client.getNetwork())).chainId !== 1n) throw new Error('network');
    await checkWallet();
    const [transaction, receipt] = await Promise.all([
      read(() => client.getTransaction(reference)),
      read(() => client.getTransactionReceipt(reference)),
    ]);
    if (!transaction && !receipt) return { ...base, state: 'pending' };
    if (
      !transaction ||
      !same(transaction.hash, reference) ||
      !same(transaction.from, account) ||
      !same(transaction.to, TONSWAP_CONVERSION_CONTRACTS.gateway) ||
      transaction.chainId !== 1n
    )
      throw new Error('transaction');
    if (!receipt) return { ...base, state: 'pending' };
    if (
      !same(receipt.hash, reference) ||
      !same(receipt.from, account) ||
      !same(receipt.to, transaction.to as string) ||
      !isGetTsTransactionReference(receipt.blockHash) ||
      !same(transaction.blockHash, receipt.blockHash) ||
      !height(receipt.blockNumber) ||
      transaction.blockNumber !== receipt.blockNumber ||
      ![0, 1].includes(receipt.status as number)
    )
      throw new Error('receipt');
    const latest = await read(() => client.getBlockNumber());
    if (!height(latest)) throw new Error('height');
    if (latest < receipt.blockNumber) return { ...base, state: 'pending' };
    await checkWallet();
    const canonical = await read(() => client.getBlock(receipt.blockNumber));
    if (!canonical || canonical.number !== receipt.blockNumber || !same(canonical.hash, receipt.blockHash))
      throw new Error('canonical');
    const included = { ...base, blockHash: receipt.blockHash, blockNumber: receipt.blockNumber };
    if (receipt.status === 0) {
      if (!Array.isArray(receipt.logs) || receipt.logs.length !== 0) throw new Error('reverted logs');
      return { ...included, state: 'failed' };
    }
    const amount = getTsConversionReceiptAmount(receipt, account);
    if (!amount) throw new Error('output');
    return { ...included, state: 'received', amount };
  } catch {
    return { ...base, state: 'unavailable' };
  }
}
