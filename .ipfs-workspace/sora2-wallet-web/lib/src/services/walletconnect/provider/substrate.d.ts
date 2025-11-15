import { WcProvider, type ChainId } from './base';
import type { SignerPayloadJSON } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import type { EngineTypes } from '@walletconnect/types';
export declare class WcSubProvider extends WcProvider {
  protected namespace: string;
  protected getConnectParams(requiredChains: ChainId[], optionalChains: ChainId[]): EngineTypes.ConnectParams;
  protected formatChainId(chainId: ChainId): string;
  getAccounts(): string[];
  signTransaction(payload: SignerPayloadJSON): Promise<HexString>;
}
