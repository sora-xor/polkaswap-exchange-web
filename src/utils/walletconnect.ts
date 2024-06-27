import { WC } from '@soramitsu/soraneo-wallet-web';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

import type {
  ChainsProps,
  ConnectOps,
  EthereumProviderOptions,
} from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import type { SessionTypes } from '@walletconnect/types';

export class WcEthereumProvider extends EthereumProvider {
  static override async init(opts: EthereumProviderOptions): Promise<WcEthereumProvider> {
    const provider = new WcEthereumProvider();
    await provider.initialize(opts);
    return provider;
  }

  protected _session!: SessionTypes.Struct | undefined;
  // protected pairingTopicKey = `${this.STORAGE_KEY}/pairingTopic`;

  override get session(): SessionTypes.Struct | undefined {
    return this._session;
  }

  protected async setAppSession(session: SessionTypes.Struct | undefined): Promise<void> {
    if (!session) return;

    this._session = session;

    // await this.signer.client.core.storage.setItem(this.pairingTopicKey, session.pairingTopic);
  }

  public override async connect(opts?: ConnectOps): Promise<void> {
    await super.connect();
    this.setAppSession(this.signer.session);
  }

  protected override async loadPersistedSession(): Promise<void> {
    // const sessionTopic = await this.signer.client.core.storage.getItem(this.pairingTopicKey);

    // if (sessionTopic) {
    //   try {
    //     const session = this.signer.client.pairing.get(sessionTopic);
    //     if (session) {
    //       this.setAppSession(session);
    //     } else {
    //       throw new Error('Session not found');
    //     }
    //   } catch {
    //     this.signer.client.core.storage.removeItem(this.pairingTopicKey);
    //   }
    // }

    await super.loadPersistedSession();
  }
}

export const checkWalletConnectAvailability = async (chainProps: ChainsProps): Promise<void> => {
  try {
    const chainIdCheck = chainProps.chains?.[0] ?? 1;
    const url = `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainIdCheck}&projectId=${WC.WcProvider.projectId}`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }),
    });
  } catch {
    throw new Error('provider.messages.notAvailable');
  }
};

export const getWcEthereumProvider = async (chainProps: ChainsProps): Promise<WcEthereumProvider> => {
  await checkWalletConnectAvailability(chainProps);

  const ethereumProvider = await WcEthereumProvider.init({
    projectId: WC.WcProvider.projectId,
    showQrModal: true,
    ...chainProps,
  });

  return ethereumProvider;
};
