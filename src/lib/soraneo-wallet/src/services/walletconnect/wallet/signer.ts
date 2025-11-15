import type { WcProvider } from '../provider/base';
import type { Signer, SignerPayloadJSON, SignerResult } from '@polkadot/types/types';

export default class WcSigner implements Signer {
  private wcProvider!: WcProvider;

  constructor(wcProvider: WcProvider) {
    this.wcProvider = wcProvider;
  }

  /** Signs an extrinsic payload from a serialized form */
  async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const signature = await this.wcProvider.signTransaction(payload);

    return {
      id: parseInt(payload.nonce, 16),
      signature,
    };
  }
}
