import { WC } from '@soramitsu/soraneo-wallet-web';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

import type {
  ChainsProps,
  ConnectOps,
  EthereumProviderOptions,
} from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import type { SessionTypes } from '@walletconnect/types';

export class WcEthereumProvider extends EthereumProvider {
  /**
   * "Init" is overrided to return the instance of this child class
   */
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

  protected async restoreAppSession(): Promise<void> {
    if (this.session) return;

    const chainId = this.formatChainId(this.chainId);
    const sessions = this.signer.client.session.values;

    for (const session of sessions) {
      const sessionData = session.namespaces[this.namespace];

      if (!sessionData) continue;

      const sessionChains = sessionData.chains;

      if (!(Array.isArray(sessionChains) && sessionChains.includes(chainId))) continue;

      const pairingTopic = session.pairingTopic;
      const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      try {
        console.info(`[${this.constructor.name}]: active pairing found: "${pairingTopic}"`);
        await this.signer.client.core.pairing.activate({ topic: pairingTopic });
        console.info(`[${this.constructor.name}]: pairing activated: "${pairingTopic}"`);
        await this.signer.client.core.pairing.updateExpiry({ topic: pairingTopic, expiry });
        console.info(`[${this.constructor.name}]: pairing expiry updated: "${pairingTopic}"`);
        this.setAppSession(session);
        return;
      } catch {
        console.info(
          `[${this.constructor.name}]: pairing not active: "${pairingTopic}". Session "${session.topic}" deleted.`
        );
        this.signer.client.disconnect({
          topic: session.topic,
          reason: {
            code: 6000, // https://specs.walletconnect.com/2.0/specs/clients/sign/error-codes#reason
            message: 'Disconnected by dApp',
          },
        });
      }
    }
  }

  public override async connect(opts?: ConnectOps): Promise<void> {
    // eslint-disable-next-line
    await new Promise<void>(async (resolve, reject) => {
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

      try {
        await this.restoreAppSession();

        if (!this.session) {
          await super.connect(opts);

          this.setAppSession(this.signer.session);
        }

        resolve();
      } catch (error) {
        await this.signer.disconnect();
        reject(error);
      }
    });
  }
}

export const checkWalletConnectAvailability = async (chainProps?: ChainsProps): Promise<void> => {
  const chainIdCheck = chainProps?.chains?.[0] ?? 1;
  const url = `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainIdCheck}&projectId=${WC.WcProvider.projectId}`;

  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }),
  });
};

export const getWcEthereumProvider = async (
  chainProps?: ChainsProps
): Promise<InstanceType<typeof EthereumProvider>> => {
  try {
    const props = chainProps ?? { chains: [1] };

    await checkWalletConnectAvailability(props);

    const ethereumProvider = await WcEthereumProvider.init({
      projectId: WC.WcProvider.projectId,
      showQrModal: true,
      qrModalOptions: {
        themeVariables: {
          '--wcm-z-index': '9999',
        },
      },
      ...props,
    });

    return ethereumProvider;
  } catch (error) {
    console.error(error);
    throw new Error('provider.messages.notAvailable');
  }
};
