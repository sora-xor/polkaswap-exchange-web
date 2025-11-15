import type { WcProvider } from '../provider/base';
import type { Signer, SignerPayloadJSON, SignerResult } from '@polkadot/types/types';
export default class WcSigner implements Signer {
  private wcProvider;
  constructor(wcProvider: WcProvider);
  /** Signs an extrinsic payload from a serialized form */
  signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
}
