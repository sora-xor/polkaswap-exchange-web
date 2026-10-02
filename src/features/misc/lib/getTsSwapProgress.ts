import { FPNumber, Operation, type HistoryItem } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { areBridgeExternalAccountsEqual } from '@/utils/bridge/common/account';
import { isGetTsTransactionReference } from './getTsPlan';
import { isPrunedGetTsSwapStateError } from './getTsSwapArchive';

export interface GetTsSwapProgress {
  state: 'idle' | 'pending' | 'received' | 'failed' | 'unavailable';
  reference?: string;
  historyId?: string;
  blockId?: string;
  /** Exact swap output minus observed XOR fee, when the finalized fee event is available. */
  xorReceived?: string;
}
interface TextCodec {
  toString(): string;
}
interface Header {
  number: { toNumber(): number };
  hash: TextCodec;
}
interface SwapExtrinsic {
  hash: TextCodec;
  isSigned: boolean;
  signer: TextCodec;
  method: { section: string; method: string; args: ArrayLike<unknown> };
}
interface SwapEvent {
  phase: { isApplyExtrinsic: boolean; asApplyExtrinsic: { toNumber(): number } };
  event: { section: string; method: string; data: ArrayLike<unknown> };
}
export interface GetTsArchivedSwapEvidence {
  block: { header: Header; extrinsics: ArrayLike<SwapExtrinsic> };
  events: ArrayLike<SwapEvent>;
}
export interface GetTsSwapReadClient {
  rpc: {
    chain: {
      getFinalizedHead(): Promise<TextCodec>;
      getHeader(hash: string): Promise<Header>;
      getBlockHash(height: number): Promise<TextCodec>;
      getBlock(hash: string): Promise<{ block: { header: Header; extrinsics: ArrayLike<SwapExtrinsic> } }>;
    };
  };
  at(hash: string): Promise<{ query: { system: { events(): Promise<ArrayLike<SwapEvent>> } } }>;
}

const textValue = (value: unknown): string =>
  String(value && typeof value === 'object' && 'code' in value ? value.code : value);
const codecAmount = (value: unknown): FPNumber | null => {
  const raw = textValue(value);
  return /^(?:0|[1-9]\d{0,77})$/.test(raw) ? FPNumber.fromCodecValue(raw) : null;
};

/** A stored status is ignored; history supplies only the exact swap's candidate block locator. */
export function matchGetTsSwapHistory(
  history: readonly HistoryItem[],
  reference: string,
  account: string
): HistoryItem | null {
  if (!isGetTsTransactionReference(reference)) return null;
  const matches = history.filter(
    (row) =>
      (row.txId?.toLowerCase() === reference.toLowerCase() || row.id?.toLowerCase() === reference.toLowerCase()) &&
      row.type === Operation.Swap &&
      row.assetAddress === DAI.address &&
      row.asset2Address === XOR.address &&
      areBridgeExternalAccountsEqual(row.from, account)
  );
  return matches.find((row) => isGetTsTransactionReference(row.blockId)) ?? matches[0] ?? null;
}

/** Reads only this hash's canonical finalized DAI→XOR extrinsic and its own success/failure events. */
export async function readGetTsSwapProgress(
  client: GetTsSwapReadClient,
  row: HistoryItem,
  reference: string,
  account: string,
  isCurrent: () => boolean,
  readArchive?: (hash: string, height: number) => Promise<GetTsArchivedSwapEvidence>
): Promise<GetTsSwapProgress> {
  const base = { reference, historyId: row.id };
  if (!isGetTsTransactionReference(row.blockId)) return { ...base, state: 'pending' };
  const candidate = row.blockId;
  const read = async <T>(action: () => Promise<T>): Promise<T> => {
    if (!isCurrent()) throw new Error('context');
    const result = await action();
    if (!isCurrent()) throw new Error('context');
    return result;
  };
  try {
    const head = (await read(() => client.rpc.chain.getFinalizedHead())).toString();
    const finalized = await read(() => client.rpc.chain.getHeader(head));
    const header = await read(() => client.rpc.chain.getHeader(candidate));
    const height = header.number.toNumber();
    const finalizedHeight = finalized.number.toNumber();
    if (
      !Number.isSafeInteger(height) ||
      height < 1 ||
      !Number.isSafeInteger(finalizedHeight) ||
      finalizedHeight < 1 ||
      header.hash.toString() !== candidate ||
      finalized.hash.toString() !== head
    )
      throw new Error('header');
    if (height > finalizedHeight) return { ...base, state: 'pending' };
    const canonical = (await read(() => client.rpc.chain.getBlockHash(height))).toString();
    if (canonical !== candidate) throw new Error('fork');
    let archived: GetTsArchivedSwapEvidence | undefined;
    const archive = async (error: unknown): Promise<GetTsArchivedSwapEvidence> => {
      if (!readArchive || !isPrunedGetTsSwapStateError(error)) throw error;
      archived ??= await read(() => readArchive(candidate, height));
      return archived;
    };
    // Polkadot's block decoder also asks for historical runtime state, which a
    // pruning node may have discarded even while it retains the block itself.
    const { block } = await read(() => client.rpc.chain.getBlock(candidate)).catch(archive);
    if (
      block.header.hash.toString() !== candidate ||
      block.header.number.toNumber() !== height ||
      block.extrinsics.length > 65_536
    )
      throw new Error('block');
    const matches = Array.from(block.extrinsics)
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.hash.toString().toLowerCase() === reference.toLowerCase());
    if (matches.length !== 1) throw new Error('hash');
    const { item, index } = matches[0];
    if (
      !item.isSigned ||
      !areBridgeExternalAccountsEqual(item.signer.toString(), account) ||
      item.method.section !== 'liquidityProxy' ||
      item.method.method !== 'swap' ||
      textValue(item.method.args[1]) !== DAI.address ||
      textValue(item.method.args[2]) !== XOR.address
    )
      throw new Error('swap');
    const records = archived
      ? archived.events
      : await (async () => {
          const at = await read(() => client.at(candidate));
          return read(() => at.query.system.events());
        })().catch(async (error) => (await archive(error)).events);
    if (records.length > 65_536) throw new Error('events');
    let success = 0;
    let failed = 0;
    let output: FPNumber | null = null;
    let fee: FPNumber | null = null;
    for (const record of Array.from(records)) {
      if (!record.phase.isApplyExtrinsic || record.phase.asApplyExtrinsic.toNumber() !== index) continue;
      const event = record.event;
      if (event.section === 'system' && event.method === 'ExtrinsicSuccess') success++;
      if (event.section === 'system' && event.method === 'ExtrinsicFailed') failed++;
      if (event.section === 'liquidityProxy' && event.method === 'Exchange') {
        if (
          output ||
          event.data.length < 6 ||
          !areBridgeExternalAccountsEqual(textValue(event.data[0]), account) ||
          textValue(event.data[2]) !== DAI.address ||
          textValue(event.data[3]) !== XOR.address
        )
          throw new Error('exchange');
        output = codecAmount(event.data[5]);
        if (!output?.gt(FPNumber.ZERO)) throw new Error('output');
      }
      if (event.section === 'xorFee' && event.method === 'FeeWithdrawn') {
        if (
          fee ||
          ![2, 3].includes(event.data.length) ||
          !areBridgeExternalAccountsEqual(textValue(event.data[0]), account) ||
          (event.data.length === 3 && textValue(event.data[1]) !== XOR.address)
        )
          throw new Error('fee');
        fee = codecAmount(event.data[event.data.length - 1]);
        if (!fee) throw new Error('fee');
      }
    }
    if (success === 0 && failed === 1 && !output) return { ...base, blockId: candidate, state: 'failed' };
    if (success !== 1 || failed !== 0 || !output) throw new Error('result');
    const net = fee ? output.sub(fee) : null;
    return {
      ...base,
      blockId: candidate,
      state: 'received',
      ...(net?.gt(FPNumber.ZERO) ? { xorReceived: net.toString() } : {}),
    };
  } catch {
    return { ...base, state: 'unavailable' };
  }
}
