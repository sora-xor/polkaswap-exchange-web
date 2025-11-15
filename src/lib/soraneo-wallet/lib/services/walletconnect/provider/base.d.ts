import { default as UniversalProvider } from '@walletconnect/universal-provider';
import { WalletConnectModal } from '../appkit';
import { ChainNamespace } from '@reown/appkit-common';
import { EngineTypes, SessionTypes, PairingTypes } from '@walletconnect/types';

export type ChainId = string | number;
export type RequestArguments = {
  method: string;
  params: any;
};
export declare class WcProvider {
  /** WalletConnect app projectId */
  static projectId: string;
  /** Chains genesis hashes: `api.genesisHash.toString()` */
  protected chains: ChainId[];
  protected optionalChains: ChainId[];
  protected onDisconnect?: VoidFunction;
  protected namespace: ChainNamespace;
  provider: InstanceType<typeof UniversalProvider>;
  modal: WalletConnectModal;
  session: SessionTypes.Struct | undefined;
  constructor({
    chains,
    optionalChains,
    onDisconnect,
  }: {
    chains: ChainId[];
    optionalChains?: ChainId[];
    onDisconnect?: VoidFunction;
  });
  get chainId(): ChainId;
  get ready(): boolean;
  get isConnected(): boolean;
  get signer(): UniversalProvider['client'];
  init(): Promise<void>;
  /**
   * On user action (e.g. user clicks connect for WalletConnect),
   * call the connect method on the providers sign client passing in preferred params.
   */
  connect(): Promise<void>;
  disconnect(): void;
  protected getCurrentSession(): SessionTypes.Struct;
  protected onSessionDisconnect({ topic }: { topic: any }): void;
  /** Restore active session with connected wallet  */
  protected restoreSession(): Promise<void>;
  /** Delete session from dApp and connected wallet */
  protected disconnectSession(session?: PairingTypes.Struct | SessionTypes.Struct): Promise<void>;
  protected getConnectParams(chains: ChainId[], optionalChains: ChainId[]): EngineTypes.ConnectParams;
  protected formatChainId(chainId: ChainId): string;
  getAccounts(): string[];
  request<T = unknown>(request: RequestArguments, expiry?: number): Promise<T>;
  signTransaction(payload: any): Promise<any>;
  on(event: string, listener: any): void;
  once(event: string, listener: any): void;
  removeListener(event: string, listener: any): void;
  off(event: string, listener: any): void;
}
