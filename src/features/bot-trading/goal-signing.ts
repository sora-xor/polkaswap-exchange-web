/** Private per-request SDK signer adapter. It captures actual signing payloads without broadcasting. */
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { AnyNumber, IKeyringPair, Signer, SignerPayloadJSON } from '@polkadot/types/types';
import {
  captureGoalSigningPayload,
  goalRawSigningPayload,
  retainGoalSignedMortality,
  signCapturedGoalPayload,
  type GoalSigningPayloadCapture,
} from './goal-mortality';
type Extrinsic = SubmittableExtrinsic<'promise'>;
export interface GoalSigningOptions {
  transaction: Extrinsic;
  account: string;
  nonce: AnyNumber;
  metadataHex: string;
  genesisHash: string;
  runtimeVersion: { specVersion: number; transactionVersion: number };
  pair?: IKeyringPair;
  externalSigner?: Signer;
  /** Checks the owning private signer and original client/runtime before exposing a signing request. */
  assertCurrent(): void;
}
/**
 * Preserve signAsync's public return type and exact SDK-selected checkpoint. Even an invalid
 * returned signature is returned to the executor for durable recording, but receives no private
 * mortality capability. No shared SDK signer, wallet object or global key is modified.
 */
export async function signGoalExtrinsic(options: GoalSigningOptions): Promise<Extrinsic> {
  const { transaction, account, nonce, pair, externalSigner, metadataHex, genesisHash, runtimeVersion, assertCurrent } =
    options;
  assertCurrent();
  if (!!pair === !!externalSigner) throw Error('bots.errors.wallet');
  const callHex = transaction.method.toHex();
  const version = { ...runtimeVersion };
  let capture: GoalSigningPayloadCapture | undefined;
  let captureAttempted = false;
  const signer: Signer = {
    signPayload: async (payload: SignerPayloadJSON) => {
      assertCurrent();
      if (captureAttempted) throw Error('bots.errors.intent');
      captureAttempted = true;
      capture = captureGoalSigningPayload({
        metadataHex,
        account,
        genesisHash,
        callHex,
        runtimeVersion: version,
        payload,
      });
      const detached = { ...capture.payload, signedExtensions: [...capture.payload.signedExtensions] };
      assertCurrent();
      if (pair) return { id: 0, ...signCapturedGoalPayload(capture, pair) };
      if (externalSigner?.signPayload) return externalSigner.signPayload(detached);
      if (externalSigner?.signRaw)
        return externalSigner.signRaw({ address: account, data: goalRawSigningPayload(capture), type: 'payload' });
      throw Error('bots.errors.wallet');
    },
  };
  const signOptions = {
    nonce,
    era: 64,
    signer,
    allowCallDataAlteration: false,
    withSignedTransaction: false,
  };
  const signed = await transaction.signAsync(account, signOptions);
  // Do not reject a returned signed fact solely because Stop won the signing await.
  if (capture) retainGoalSignedMortality(capture, signed);
  return signed;
}
