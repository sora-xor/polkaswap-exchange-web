import UniversalProvider from '@walletconnect/universal-provider';

import { ensureWalletConnectModal, type WalletConnectModal } from '../appkit';
import type { ChainNamespace } from '@reown/appkit-common';
import type { EngineTypes, SessionTypes, PairingTypes } from '@walletconnect/types';

export type ChainId = string | number;

export type RequestArguments = {
  method: string;
  params: any;
};

export class WcProvider {
  /** WalletConnect app projectId */
  public static projectId = '';
  /** Chains genesis hashes: `api.genesisHash.toString()` */
  protected chains!: ChainId[];
  protected optionalChains!: ChainId[];
  protected onDisconnect?: VoidFunction;

  protected namespace!: ChainNamespace;

  public provider!: InstanceType<typeof UniversalProvider>;
  public modal!: WalletConnectModal;
  public session!: SessionTypes.Struct | undefined;

  constructor({
    chains,
    optionalChains = [],
    onDisconnect,
  }: {
    chains: ChainId[];
    optionalChains?: ChainId[];
    onDisconnect?: VoidFunction;
  }) {
    this.chains = chains;
    this.optionalChains = optionalChains;
    this.onDisconnect = onDisconnect;
  }

  get chainId(): ChainId {
    return this.chains[0];
  }

  get ready(): boolean {
    return !!this.provider && !!this.modal;
  }

  get isConnected(): boolean {
    return !!this.session;
  }

  get signer(): UniversalProvider['client'] {
    return this.provider.client;
  }

  public async init(): Promise<void> {
    if (this.ready) return;

    const projectId = WcProvider.projectId;

    if (!projectId) throw new Error(`[${this.constructor.name}]: projectId is required`);

    // Instantiate a universal provider using the projectId created for your app.
    this.provider = await UniversalProvider.init({
      projectId,
      relayUrl: 'wss://relay.walletconnect.com',
    });

    // Create a standalone modal using Reown AppKit so the QR flow matches the host dApp.
    this.modal = await ensureWalletConnectModal({
      projectId,
      namespace: this.namespace,
      chains: this.chains,
      optionalChains: this.optionalChains,
    });

    // Subscribe to session delete
    this.signer.on('session_delete', this.onSessionDisconnect.bind(this));
  }

  /**
   * On user action (e.g. user clicks connect for WalletConnect),
   * call the connect method on the providers sign client passing in preferred params.
   */
  public async connect(): Promise<void> {
    try {
      await this.init();

      await this.restoreSession();

      // already connected
      if (this.session) {
        return;
      }

      await this.provider.cleanupPendingPairings();

      const params = this.getConnectParams(this.chains, this.optionalChains);

      const { uri, approval } = await this.signer.connect(params);

      // Open the modal prompting the user to scan the QR code with their wallet app.
      // if there is a URI from the client connect step open the modal
      if (uri) {
        await this.modal.openModal({ uri });
      }

      // eslint-disable-next-line
      await new Promise<void>(async (resolve, reject) => {
        const unsub = this.modal.subscribeModal((state) => {
          if (!state.open && !this.session) {
            unsub();
            this.provider.abortPairingAttempt();
            reject(new Error('Connection request reset. Please try again.'));
          }
        });

        try {
          // await session approval from the wallet app
          this.session = await approval();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      this.provider.logger.error(error);
      throw error;
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  public disconnect(): void {
    this.disconnectSession(this.session);
  }

  protected getCurrentSession(): SessionTypes.Struct {
    if (!this.session) {
      throw new Error(`[${this.constructor.name}] Session is not estabilished`);
    }
    return this.session;
  }

  protected onSessionDisconnect({ topic }): void {
    if (this.session && this.session.topic === topic) {
      console.info(`[${this.constructor.name}] Session disconnect. Topic: "${this.session.topic}"`);
      this.session = undefined;
      this.onDisconnect?.();
    }
  }

  /** Restore active session with connected wallet  */
  protected async restoreSession(): Promise<void> {
    if (this.session) return;

    const chainId = this.formatChainId(this.chainId);
    const sessions = this.signer.session.values;

    for (const session of sessions) {
      const sessionData = session.namespaces[this.namespace];

      if (!sessionData) continue;

      const sessionChains = sessionData.chains;

      if (!(Array.isArray(sessionChains) && sessionChains.includes(chainId))) continue;

      const pairingTopic = session.pairingTopic;
      try {
        console.info(`[${this.constructor.name}]: active pairing found: "${pairingTopic}"`);
        await this.signer.core.pairing.activate({ topic: pairingTopic });
        console.info(`[${this.constructor.name}]: pairing activated: "${pairingTopic}"`);
        this.session = session;
        return;
      } catch {
        console.info(
          `[${this.constructor.name}]: pairing not active: "${pairingTopic}". Session "${session.topic}" deleted.`
        );
        this.disconnectSession(session);
      }
    }
  }

  /** Delete session from dApp and connected wallet */
  protected async disconnectSession(session?: PairingTypes.Struct | SessionTypes.Struct): Promise<void> {
    if (!session) return;

    try {
      await this.signer.disconnect({
        topic: session.topic,
        reason: {
          code: 6000, // https://specs.walletconnect.com/2.0/specs/clients/sign/error-codes#reason
          message: 'Disconnected by dApp',
        },
      });
      this.onSessionDisconnect(session);
    } catch {}
  }

  protected getConnectParams(chains: ChainId[], optionalChains: ChainId[]): EngineTypes.ConnectParams {
    console.info(`[${this.constructor.name}] "getConnectParams" is not implemented`);
    return {};
  }

  protected formatChainId(chainId: ChainId): string {
    console.info(`[${this.constructor.name}] "formatChainId" is not implemented`);
    return '';
  }

  public getAccounts(): string[] {
    const session = this.getCurrentSession();

    // Get the accounts from the session for use in constructing transactions.
    const walletConnectAccount = Object.values(session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();

    // grab account addresses from CAIP account formatted accounts
    return walletConnectAccount.map((wcAccount) => {
      const address = wcAccount.split(':')[2];

      return address;
    });
  }

  public async request<T = unknown>(request: RequestArguments, expiry?: number): Promise<T> {
    try {
      const session = this.getCurrentSession();
      const chainId = this.formatChainId(this.chainId);

      const params: EngineTypes.RequestParams = {
        chainId,
        topic: session.topic,
        request,
        expiry,
      };

      return await this.signer.request(params);
    } catch (error) {
      this.provider.logger.error(error);
      throw error;
    }
  }

  public async signTransaction(payload: any): Promise<any> {
    console.info(`[${this.constructor.name}] "signTransaction" is not implemented`);
    return '';
  }

  public on(event: string, listener: any): void {
    this.provider.on(event, listener);
  }

  public once(event: string, listener: any) {
    this.provider.once(event, listener);
  }

  public removeListener(event: string, listener: any) {
    this.provider.removeListener(event, listener);
  }

  public off(event: string, listener: any) {
    this.provider.off(event, listener);
  }
}
