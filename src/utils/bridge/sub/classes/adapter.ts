import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { map } from 'rxjs';

import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise } from '@polkadot/api';
import type { Asset } from '@sora-substrate/util/build/assets/types';

class SubAdapter {
  protected endpoint!: string;

  public connection!: Connection;

  constructor() {
    this.connection = new Connection({});
  }

  get api(): ApiPromise {
    return this.connection.api as ApiPromise;
  }

  get apiRx() {
    return this.api.rx;
  }

  get ready() {
    return this.api.isReady;
  }

  get connected(): boolean {
    return this.connection.opened;
  }

  public setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  async connect() {
    if (!this.connected && this.endpoint) {
      await this.connection.open(this.endpoint);
    }
  }

  async stop() {
    if (this.connected) {
      await this.connection.close();
    }
  }

  public async getBlockNumber() {
    await this.ready;

    const result = await this.api.query.system.number();

    return result.toNumber();
  }

  protected async getAccountBalance(accountAddress: string) {
    await this.ready;

    const accountInfo = await this.api.query.system.account(accountAddress);
    const accountBalance = formatBalance(accountInfo.data);
    const balance = accountBalance.transferable;

    return balance;
  }

  public async getAccountBalanceObservable(accountAddress: string) {
    await this.ready;

    return this.apiRx.query.system.account(accountAddress).pipe(
      map((accountInfo) => {
        const accountBalance = formatBalance(accountInfo.data);
        const balance = accountBalance.transferable;

        return balance;
      })
    );
  }

  public async getTokenBalance(accountAddress: string, tokenAddress?: string) {
    console.info(`[${this.constructor.name}] getTokenBalance method is not implemented`);
    return '0';
  }
}

class RococoAdapter extends SubAdapter {
  async getTokenBalance(accountAddress: string, tokenAddress?: string) {
    return await this.getAccountBalance(accountAddress);
  }

  async transfer(asset: Asset, recipient: string, amount: string | number, historyId?: string) {
    const value = new FPNumber(amount, asset.decimals).toCodecString();

    const historyItem = subBridgeApi.getHistory(historyId as string) || {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: SubNetwork.Rococo,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.api.tx.xcmPallet.reserveTransferAssets(
      // dest
      {
        V3: {
          parents: 0,
          interior: {
            X1: {
              Parachain: 2011,
            },
          },
        },
      },
      // beneficiary
      {
        V3: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                id: this.api.createType('AccountId32', recipient).toHex(),
              },
            },
          },
        },
      },
      // assets
      {
        V3: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: 'Here',
              },
            },
            fun: {
              Fungible: value,
            },
          },
        ],
      },
      // feeAssetItem
      0
    );

    await this.ready;
    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }
}

class SubConnector {
  public readonly adapters = {
    [SubNetwork.Rococo]: new RococoAdapter(),
    [SubNetwork.Mainnet]: new SubAdapter(),
  };

  public adapter: SubAdapter = this.adapters[SubNetwork.Rococo];

  public getAdapterForNetwork(network: SubNetwork): SubAdapter {
    const adapter = this.adapters[network];

    if (!adapter) {
      throw new Error(`[${this.constructor.name}] Adapter for "${network}" network not implemented`);
    }

    return adapter;
  }

  async open(network: SubNetwork): Promise<void> {
    // stop current adapter connection
    await this.stop();
    // set adapter for network arg
    this.adapter = this.getAdapterForNetwork(network);
    // open adapter connection
    await this.adapter.connect();
  }

  async stop(): Promise<void> {
    await this.adapter?.stop();
  }
}

export const subConnector = new SubConnector();
