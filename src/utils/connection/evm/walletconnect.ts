import { EthereumProvider } from '@walletconnect/ethereum-provider';

import type {
  ChainsProps,
  ConnectOps,
  EthereumProviderOptions,
} from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import type { SessionTypes } from '@walletconnect/types';
import type { AppKit } from '@reown/appkit';

import { ensureAppKit } from './appkit';
import {
  getWalletConnectProjectId as resolveWalletConnectProjectId,
  resetWalletConnectProjectIdCache,
} from './walletconnectProject';

const DEFAULT_CHAIN_ID = 1;
const Z_INDEX_VARIABLE = '--wcm-z-index';

const withDefaultChainProps = (chainProps?: ChainsProps): ChainsProps => {
  if (chainProps && ('chains' in chainProps ? chainProps.chains?.length : chainProps.optionalChains?.length)) {
    return chainProps;
  }
  return { chains: [DEFAULT_CHAIN_ID] };
};

const getProbeChainId = (chainProps: ChainsProps): number => {
  if ('chains' in chainProps && Array.isArray(chainProps.chains) && chainProps.chains.length > 0) {
    return chainProps.chains[0] ?? DEFAULT_CHAIN_ID;
  }
  if (
    'optionalChains' in chainProps &&
    Array.isArray(chainProps.optionalChains) &&
    chainProps.optionalChains.length > 0
  ) {
    return chainProps.optionalChains[0] ?? DEFAULT_CHAIN_ID;
  }
  return DEFAULT_CHAIN_ID;
};

type ModalState = { open: boolean };

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';
};

/**
 * Guard signer disconnect calls against SDK implementations that throw when
 * no session has been established yet.
 */
export const safeDisconnectSigner = async (signer: unknown): Promise<void> => {
  const disconnect = (signer as { disconnect?: unknown } | undefined)?.disconnect;

  if (typeof disconnect !== 'function') return;

  try {
    const result = disconnect.call(signer);
    if (isPromiseLike(result)) {
      await result.catch(() => undefined);
    }
  } catch {
    // Ignore best-effort disconnect failures.
  }
};

/**
 * WalletConnect modal integrations can expose incompatible shapes in certain
 * runtimes. Guard subscription wiring so connection flow does not hard-crash.
 */
export const safeSubscribeModal = (modal: unknown, callback: (state: ModalState) => void): (() => void) => {
  const subscribeModal = (modal as { subscribeModal?: unknown } | undefined)?.subscribeModal;

  if (typeof subscribeModal !== 'function') {
    return () => undefined;
  }

  const unsub = subscribeModal.call(modal, callback);
  return typeof unsub === 'function' ? unsub : () => undefined;
};

const attachModal = (provider: EthereumProvider, modal: AppKit): void => {
  Object.assign(provider, { modal });
};

export { resetWalletConnectProjectIdCache };

export const getWalletConnectProjectId = (): Promise<string> => {
  return resolveWalletConnectProjectId();
};

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
        try {
          const result = this.signer.client.disconnect({
            topic: session.topic,
            reason: {
              code: 6000, // https://specs.walletconnect.com/2.0/specs/clients/sign/error-codes#reason
              message: 'Disconnected by dApp',
            },
          });

          if (isPromiseLike(result)) {
            void result.catch(() => undefined);
          }
        } catch {
          // Ignore best-effort disconnect failures.
        }
      }
    }
  }

  public override async connect(opts?: ConnectOps): Promise<void> {
    // eslint-disable-next-line
    await new Promise<void>(async (resolve, reject) => {
      const unsub = safeSubscribeModal(this.modal, (state: ModalState) => {
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
        await safeDisconnectSigner(this.signer);
        reject(error);
      }
    });
  }
}

export const checkWalletConnectAvailability = async (chainProps?: ChainsProps): Promise<void> => {
  const resolvedProps = withDefaultChainProps(chainProps);
  const projectId = await resolveWalletConnectProjectId();
  const chainIdCheck = getProbeChainId(resolvedProps);
  const url = `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainIdCheck}&projectId=${projectId}`;

  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }),
  });
};

export const getWcEthereumProvider = async (
  chainProps?: ChainsProps
): Promise<InstanceType<typeof EthereumProvider>> => {
  try {
    const resolvedProps = withDefaultChainProps(chainProps);

    await checkWalletConnectAvailability(resolvedProps);

    const [projectId, appKit] = await Promise.all([resolveWalletConnectProjectId(), ensureAppKit(resolvedProps)]);

    const ethereumProvider = await WcEthereumProvider.init({
      projectId,
      showQrModal: true,
      qrModalOptions: {
        themeVariables: {
          [Z_INDEX_VARIABLE]: '9999',
        },
      },
      ...resolvedProps,
    });

    attachModal(ethereumProvider, appKit);

    return ethereumProvider;
  } catch (error) {
    console.error(error);
    throw new Error('provider.messages.notAvailable');
  }
};
