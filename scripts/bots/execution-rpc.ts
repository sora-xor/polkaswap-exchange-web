/** Public MOF RPC adapter. No wallet, account discovery, real signature, or submission API is exposed. */
import { createHash } from 'node:crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Metadata } from '@polkadot/types';
import { types, rpc, typesBundle } from '../../src/lib/substrate/type-definitions';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_KUSD,
  EXECUTION_EVIDENCE_XOR,
  canonicalEvidenceJson,
  floorMinimum,
  type ExecutionContext,
  type ExecutionRawQuote,
  type ExecutionRuntimeVersion,
} from './execution-evidence';
import type { ExecutionReader } from './execution-reader';

/** Public, non-signing fixture. Only the fake envelope's size and fee estimate are used. */
export const EXECUTION_ESTIMATION_ASSUMPTIONS = Object.freeze({
  address: 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs',
  nonce: 0,
  tip: '0',
  era: 'immortal',
  signature: 'public signFake placeholder; never validly signed or broadcast',
  chargeFeeInfo: 'registered runtime default',
});

interface Codec {
  toString(): string;
  toJSON(): unknown;
  toU8a(): Uint8Array;
}
interface AssetCodec extends Codec {
  code?: Codec;
}
interface QuoteCodec extends Codec {
  amount: Codec;
  amountWithoutImpact: Codec;
  route: AssetCodec[];
  fee: Map<AssetCodec, Codec>;
}
interface OptionCodec<T> extends Codec {
  isNone: boolean;
  unwrap(): T;
}
interface InfoCodec extends Codec {
  partialFee: Codec;
}
interface DetailsCodec extends Codec {
  inclusionFee: OptionCodec<{ baseFee: Codec; lenFee: Codec; adjustedWeightFee: Codec }>;
  tip: Codec;
}
interface PublicExecutionRpc {
  dexApi: { canExchange(dex: number, source: string, assetIn: string, assetOut: string, hash: Codec): Promise<Codec> };
  liquidityProxy: {
    quote(
      dex: number,
      assetIn: string,
      assetOut: string,
      amount: string,
      variant: string,
      sources: string[],
      filter: string,
      hash: string
    ): Promise<OptionCodec<QuoteCodec>>;
  };
}

/** Compare encoding and pinned runtime identities, including metadata rather than only version numbers. */
export function assertExecutionRuntime(
  context: Pick<ExecutionContext, 'specVersion' | 'transactionVersion' | 'metadataHash'>,
  version: ExecutionRuntimeVersion,
  metadataHash: string
): void {
  if (
    context.specVersion !== version.specVersion ||
    context.transactionVersion !== version.transactionVersion ||
    context.metadataHash !== metadataHash
  )
    throw new Error('Runtime or metadata changed across the pinned observation');
}

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const asset = (value: AssetCodec): string => value.code?.toString() ?? value.toString();

/** Check decoded method arguments against the exact quote and conservative minimum being estimated. */
export function assertExecutionCall(
  args: unknown[],
  assetIn: string,
  assetOut: string,
  amount: string,
  minimum: string
): void {
  const id = (value: unknown): unknown => (typeof value === 'string' ? value : (value as { code?: unknown })?.code);
  const variant = args[3] as { withDesiredInput?: { desiredAmountIn?: unknown; minAmountOut?: unknown } } | null;
  const balance = (value: unknown): string => {
    if (typeof value !== 'string' || !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(value))
      throw new Error('Invalid encoded balance');
    return BigInt(value).toString();
  };
  if (
    args.length !== 6 ||
    args[0] !== 0 ||
    id(args[1]) !== assetIn ||
    id(args[2]) !== assetOut ||
    !variant ||
    Object.keys(variant).length !== 1 ||
    !variant.withDesiredInput ||
    balance(variant.withDesiredInput.desiredAmountIn) !== amount ||
    balance(variant.withDesiredInput.minAmountOut) !== minimum ||
    canonicalEvidenceJson(args[4]) !== '["XYKPool"]' ||
    args[5] !== 'AllowSelected'
  )
    throw new Error('Swap encoding mismatch');
}

/** Opens only the approved endpoint, with abort cleanup active even during API initialization. */
export async function openExecutionReader(signal: AbortSignal): Promise<ExecutionReader> {
  const provider = new WsProvider(EXECUTION_EVIDENCE_ENDPOINT, false);
  let api: ApiPromise | undefined;
  const abort = (): void => {
    void provider.disconnect().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  const check = (): void => {
    if (signal.aborted) throw new Error('Execution observation aborted');
    if (!api?.isConnected) throw new Error('RPC disconnected');
    if (api.genesisHash.toString() !== EXECUTION_EVIDENCE_GENESIS) throw new Error('Unexpected genesis');
  };
  try {
    if (signal.aborted) throw new Error('Execution observation aborted');
    await provider.connect();
    if (signal.aborted) throw new Error('Execution observation aborted');
    api = await ApiPromise.create({
      provider,
      types,
      rpc,
      typesBundle,
      noInitWarn: true,
      throwOnConnect: true,
      signedExtensions: { ChargeTransactionPayment2: { extrinsic: { charge_fee_info: 'ChargeFeeInfo' }, payload: {} } },
    });
    check();
    const chain = api;
    const publicRpc = chain.rpc as unknown as PublicExecutionRpc;
    // The SDK negotiates V16 while legacy state_getMetadata can return V14 for the same runtime.
    const readMetadata = async (hash: Codec, format: number): Promise<Metadata> => {
      const parameter = `0x${Buffer.from(chain.createType('u32', format).toU8a()).toString('hex')}`;
      const response = await chain.rpc.state.call('Metadata_metadata_at_version', parameter, hash.toString());
      const opaque = chain.createType('Option<OpaqueMetadata>', Buffer.from(response.toHex().slice(2), 'hex'));
      if (opaque.isNone) throw new Error('Pinned encoding metadata format unavailable');
      const metadata = new Metadata(chain.registry, opaque.unwrap().toHex());
      if (metadata.version !== format) throw new Error('Unexpected encoding metadata format');
      return metadata;
    };
    const version = (): ExecutionRuntimeVersion => ({
      specVersion: chain.runtimeVersion.specVersion.toNumber(),
      transactionVersion: chain.runtimeVersion.transactionVersion.toNumber(),
    });
    const unchanged = async (context: ExecutionContext): Promise<void> => {
      check();
      if (chain.runtimeMetadata.version !== context.metadataFormatVersion)
        throw new Error('Encoding metadata format changed');
      assertExecutionRuntime(context, version(), sha(chain.runtimeMetadata.toU8a()));
      const head = await chain.rpc.chain.getBlockHash();
      const [headRuntime, headMetadata] = await Promise.all([
        chain.rpc.state.getRuntimeVersion(head),
        readMetadata(head, context.metadataFormatVersion),
      ]);
      check();
      assertExecutionRuntime(
        context,
        {
          specVersion: headRuntime.specVersion.toNumber(),
          transactionVersion: headRuntime.transactionVersion.toNumber(),
        },
        sha(headMetadata.toU8a())
      );
    };
    return {
      async context() {
        check();
        const hash = await chain.rpc.chain.getFinalizedHead();
        const [header, state, pinnedRuntime, metadata] = await Promise.all([
          chain.rpc.chain.getHeader(hash),
          chain.at(hash),
          chain.rpc.state.getRuntimeVersion(hash),
          readMetadata(hash, chain.runtimeMetadata.version),
        ]);
        const [timestamp, denominator, pool, inputInfo, outputInfo, dexInfo, forward, reverse] = await Promise.all([
          state.query.timestamp.now(),
          state.query.denomination.denominator(),
          state.query.poolXYK.properties(EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_KUSD),
          state.query.assets.assetInfosV2({ code: EXECUTION_EVIDENCE_KUSD }),
          state.query.assets.assetInfosV2({ code: EXECUTION_EVIDENCE_XOR }),
          state.query.dexManager.dexInfos(0),
          publicRpc.dexApi.canExchange(0, 'XYKPool', EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, hash),
          publicRpc.dexApi.canExchange(0, 'XYKPool', EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_KUSD, hash),
        ]);
        const precision = (info: { toJSON(): unknown }): unknown =>
          (info.toJSON() as { precision?: unknown })?.precision;
        const dex = dexInfo.toJSON() as { baseAssetId?: { code?: string } } | null;
        if (
          precision(inputInfo) !== 18 ||
          precision(outputInfo) !== 18 ||
          dex?.baseAssetId?.code !== EXECUTION_EVIDENCE_XOR ||
          pool.toJSON() === null ||
          forward.toString() !== 'true' ||
          reverse.toString() !== 'true'
        ) {
          throw new Error('Exact 18-decimal DEX 0 KUSD/XOR XYK pool unavailable');
        }
        const context: ExecutionContext = {
          endpoint: EXECUTION_EVIDENCE_ENDPOINT,
          genesisHash: chain.genesisHash.toString(),
          blockHash: hash.toString(),
          blockNumber: header.number.toNumber(),
          finalizedAt: Number(timestamp.toString()),
          denominator: denominator.toString(),
          specVersion: pinnedRuntime.specVersion.toNumber(),
          transactionVersion: pinnedRuntime.transactionVersion.toNumber(),
          metadataHashAlgorithm: 'sha256',
          metadataHash: sha(metadata.toU8a()),
          metadataFormatVersion: metadata.version,
          metadataReadMethod: 'Metadata_metadata_at_version',
          dexId: 0,
          allowedSourceTypes: ['XYKPool'],
          filterMode: 'AllowSelected',
          poolIdentity: canonicalEvidenceJson(pool.toJSON()),
        };
        await unchanged(context);
        return context;
      },
      async quote(context, assetIn, assetOut, amountInCodec, onPartial): Promise<ExecutionRawQuote> {
        await unchanged(context);
        const response = (await publicRpc.liquidityProxy.quote(
          0,
          assetIn,
          assetOut,
          amountInCodec,
          'WithDesiredInput',
          ['XYKPool'],
          'AllowSelected',
          context.blockHash
        )) as unknown as OptionCodec<QuoteCodec>;
        if (response.isNone) throw new Error('No exact-input XYK quote');
        const quote = response.unwrap();
        const partial: Record<string, unknown> = {
          blockHash: context.blockHash,
          assetIn,
          assetOut,
          amountInCodec,
          rawQuoteJson: quote.toJSON(),
        };
        const emit = (): void => {
          onPartial?.(JSON.parse(canonicalEvidenceJson(partial)) as Record<string, unknown>);
        };
        emit();
        const minimum = floorMinimum(quote.amount.toString());
        const tx = chain.tx.liquidityProxy.swap(
          0,
          assetIn,
          assetOut,
          { WithDesiredInput: { desiredAmountIn: amountInCodec, minAmountOut: minimum } },
          ['XYKPool'],
          'AllowSelected'
        );
        const callHex = tx.method.toHex();
        // Decode the encoded call to ensure the exact amount, minimum and source policy survived encoding.
        const args = chain.createType('Call', callHex).args.map((arg) => arg.toJSON());
        assertExecutionCall(args, assetIn, assetOut, amountInCodec, minimum);
        tx.signFake(EXECUTION_ESTIMATION_ASSUMPTIONS.address, {
          nonce: 0,
          tip: 0,
          genesisHash: chain.genesisHash,
          blockHash: chain.genesisHash,
          runtimeVersion: chain.runtimeVersion,
        });
        const bytes = tx.toU8a();
        Object.assign(partial, {
          minimumCodec: minimum,
          callHex,
          envelopeHash: sha(bytes),
          encodedLength: bytes.length,
        });
        emit();
        const state = await chain.at(context.blockHash);
        const [queryInfo, feeDetails] = await Promise.all([
          state.call.transactionPaymentApi.queryInfo(bytes, bytes.length).then((value) => {
            partial.rawQueryInfo = value.toJSON();
            emit();
            return value;
          }),
          state.call.transactionPaymentApi.queryFeeDetails(bytes, bytes.length).then((value) => {
            partial.rawFeeDetails = value.toJSON();
            emit();
            return value;
          }),
        ]);
        const info = queryInfo as unknown as InfoCodec;
        const details = feeDetails as unknown as DetailsCodec;
        if (details.inclusionFee.isNone) throw new Error('Missing inclusion fee');
        const inclusion = details.inclusionFee.unwrap();
        const routeFees: ExecutionRawQuote['routeFees'] = [];
        quote.fee.forEach((amount, address) =>
          routeFees.push({ assetAddress: asset(address), amountCodec: amount.toString() })
        );
        await unchanged(context);
        return {
          blockHash: context.blockHash,
          assetIn,
          assetOut,
          assetInDecimals: 18,
          assetOutDecimals: 18,
          amountInCodec,
          amountOutCodec: quote.amount.toString(),
          amountWithoutImpactCodec: quote.amountWithoutImpact.toString(),
          route: quote.route.map(asset),
          routeFees,
          rawQuoteJson: quote.toJSON(),
          fee: {
            partialFeeCodec: info.partialFee.toString(),
            baseFeeCodec: inclusion.baseFee.toString(),
            lenFeeCodec: inclusion.lenFee.toString(),
            adjustedWeightFeeCodec: inclusion.adjustedWeightFee.toString(),
            tipCodec: details.tip.toString(),
            encodedLength: bytes.length,
            callHex,
            envelopeHashAlgorithm: 'sha256',
            envelopeHash: sha(bytes),
            blockHash: context.blockHash,
            runtimeVersion: { specVersion: context.specVersion, transactionVersion: context.transactionVersion },
            rawQueryInfo: info.toJSON(),
            rawFeeDetails: details.toJSON(),
          },
        };
      },
      assertUnchanged: unchanged,
      async close() {
        signal.removeEventListener('abort', abort);
        await chain.disconnect();
      },
    };
  } catch (error) {
    signal.removeEventListener('abort', abort);
    await provider.disconnect().catch(() => undefined);
    throw error;
  }
}
