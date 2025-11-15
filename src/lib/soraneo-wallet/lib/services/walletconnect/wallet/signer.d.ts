import { WcProvider } from '../provider/base';
import { Signer, SignerPayloadJSON, SignerResult } from '@polkadot/types/types';

export default class WcSigner implements Signer {
  private wcProvider;
  constructor(wcProvider: WcProvider);
  /** Signs an extrinsic payload from a serialized form */
  signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
}
