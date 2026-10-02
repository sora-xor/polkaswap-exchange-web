/** Synthetic SDK payloads and disposable test-only keypairs; no connected wallet or chain data. */
import { Keyring } from '@polkadot/keyring';
import type { KeypairType } from '@polkadot/util-crypto/types';
import type { Signer, SignerPayloadJSON } from '@polkadot/types/types';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { vi } from 'vitest';
import { createHistoricalFeeMetadataFixture } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';
import {
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_KUSD,
  HISTORICAL_EXECUTION_XOR,
} from '@/features/bot-trading/execution-codecs/execution';

export function goalSigningFixture(type: KeypairType = 'ed25519') {
  const fixture = createHistoricalFeeMetadataFixture();
  const pair = new Keyring({ type, ss58Format: 69 }).addFromSeed(new Uint8Array(32).fill(8));
  const { registry, identity } = fixture;
  const callHex = createHistoricalExecutionCodec(identity).buildSwapEnvelope({
    assetIn: HISTORICAL_EXECUTION_KUSD,
    assetOut: HISTORICAL_EXECUTION_XOR,
    amountInCodec: '2500000000000000000',
    quotedAmountOutCodec: '1000000000000000000',
  }).callHex;
  const payload: SignerPayloadJSON = {
    address: pair.address,
    blockHash: identity.blockHash as `0x${string}`,
    blockNumber: '0x0000014f',
    era: registry.createType('ExtrinsicEra', { current: 335, period: 64 }).toHex(),
    genesisHash: identity.genesisHash as `0x${string}`,
    method: callHex,
    nonce: '0x00000007',
    specVersion: '0x00000082',
    tip: '0x00',
    transactionVersion: '0x00000082',
    signedExtensions: [...registry.signedExtensions],
    version: 4,
  };
  const signed = (input = payload, signature?: `0x${string}`) => {
    const tx = registry.createType('Extrinsic', registry.createType('Call', input.method), { version: 4 });
    const encoded = registry.createType('ExtrinsicPayload', input, { version: 4 });
    tx.addSignature(input.address, signature ?? encoded.sign(pair).signature, encoded.toHex());
    return tx;
  };
  const input = {
    metadataHex: identity.metadataHex,
    account: pair.address,
    genesisHash: identity.genesisHash,
    callHex,
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
    payload,
  };
  const transaction = registry.createType('Extrinsic', registry.createType('Call', callHex), { version: 4 });
  const signAsync = vi.fn(async (_account: string, options: { signer?: Signer }) => {
    const result = await options.signer!.signPayload!(payload);
    transaction.addSignature(
      pair.address,
      result.signature,
      registry.createType('ExtrinsicPayload', payload, { version: 4 }).toHex()
    );
    return transaction as unknown as SubmittableExtrinsic<'promise'>;
  });
  Object.assign(transaction, { signAsync });
  return {
    ...fixture,
    pair,
    payload,
    input,
    signed,
    transaction: transaction as unknown as SubmittableExtrinsic<'promise'>,
    signAsync,
  };
}
