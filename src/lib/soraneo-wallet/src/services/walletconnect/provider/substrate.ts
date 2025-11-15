import { formatAccountAddress } from '../../../util';

import { WcProvider, type ChainId } from './base';

import type { SignerPayloadJSON } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import type { EngineTypes } from '@walletconnect/types';
import type { ChainNamespace } from '@reown/appkit-common';

const namespace = 'polkadot' as ChainNamespace;

const methods = ['polkadot_signTransaction'];

const events = ['accountsChanged'];

export class WcSubProvider extends WcProvider {
  protected namespace: ChainNamespace = namespace;

  protected override getConnectParams(requiredChains: ChainId[], optionalChains: ChainId[]): EngineTypes.ConnectParams {
    const params: EngineTypes.ConnectParams = {};

    if (requiredChains.length) {
      const chains = requiredChains.map((chainId) => this.formatChainId(chainId));
      Object.assign(params, {
        requiredNamespaces: {
          [namespace]: {
            methods,
            chains,
            events,
          },
        },
      });
    }

    if (optionalChains.length) {
      const chains = optionalChains.map((chainId) => this.formatChainId(chainId));
      Object.assign(params, {
        optionalNamespaces: {
          [namespace]: {
            methods,
            chains,
            events,
          },
        },
      });
    }

    return params;
  }

  protected override formatChainId(chainId: ChainId): string {
    // https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-13.md
    return `${namespace}:${String(chainId).slice(2, 34)}`;
  }

  public override getAccounts(): string[] {
    const accounts = super.getAccounts();
    const uniqueAccounts = [...new Set(accounts.map((acc) => formatAccountAddress(acc, false)))];

    return uniqueAccounts;
  }

  public override async signTransaction(payload: SignerPayloadJSON): Promise<HexString> {
    try {
      const params = {
        method: 'polkadot_signTransaction',
        params: {
          address: payload.address,
          transactionPayload: payload,
        },
      };

      const result = await this.request<{ signature: HexString }>(params);

      return result.signature;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
