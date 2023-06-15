import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise } from '@polkadot/api';
import type { Asset } from '@sora-substrate/util/build/assets/types';

class SubAdapter {
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

  async connect(endpoint: string) {
    this.stop();

    this.connection.endpoint = endpoint;
    await this.connection.open();
  }

  async stop() {
    await this.connection.close();
  }

  public async getAccountBalance(accountAddress: string) {
    const data = await this.api.query.system.account(accountAddress);

    return formatBalance(data);
  }
}

class RococoAdapter extends SubAdapter {
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

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }
}

const SubstrateRococoAdapter = new RococoAdapter();

export const getSubNetworkAdapter = (network: SubNetwork) => {
  return SubstrateRococoAdapter;
};
