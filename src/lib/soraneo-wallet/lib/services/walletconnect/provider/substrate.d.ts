import { WcProvider, ChainId } from './base';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { EngineTypes } from '@walletconnect/types';
import { ChainNamespace } from '@reown/appkit-common';

export declare class WcSubProvider extends WcProvider {
  protected namespace: ChainNamespace;
  protected getConnectParams(requiredChains: ChainId[], optionalChains: ChainId[]): EngineTypes.ConnectParams;
  protected formatChainId(chainId: ChainId): string;
  getAccounts(): string[];
  signTransaction(payload: SignerPayloadJSON): Promise<HexString>;
}
