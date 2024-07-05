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

  override get session(): SessionTypes.Struct | undefined {
    return this._session;
  }

  protected async setAppSession(session: SessionTypes.Struct | undefined): Promise<void> {
    if (!session) return;
    this._session = session;
  }

  public override async connect(opts?: ConnectOps): Promise<void> {
    // eslint-disable-next-line
    await new Promise<void>(async(resolve, reject) => {
      const unsub = this.modal?.subscribeModal((state: { open: boolean }) => {
        // This is the fix of modal close handler to check only ethereum session
        if (
          !state.open &&
          (!this.signer.session || !Object.keys(this.signer.session.namespaces).includes(this.namespace))
        ) {
          unsub();
          this.signer.abortPairingAttempt();
          reject(new Error('Connection request reset. Please try again.'));
        }
      });

      await super.connect(opts);

      this.setAppSession(this.signer.session);

      resolve();
    });
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
