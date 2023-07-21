import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';
import type { SubNetworkApps } from '@/store/web3/types';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise } from '@polkadot/api';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class SubAdapter {
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

  get connected(): boolean {
    return this.connection.opened;
  }

  public setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  public async connect(): Promise<void> {
    if (!this.connected && this.endpoint) {
      await this.connection.open(this.endpoint);
    }
  }

  public async stop(): Promise<void> {
    if (this.connected) {
      await this.connection.close();
    }
  }

  public async getBlockNumber(): Promise<number> {
    if (!this.connected) return 0;

    const result = await this.api.query.system.number();

    return result.toNumber();
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    if (!this.connected) return ZeroStringValue;

    const accountInfo = await this.api.query.system.account(accountAddress);
    const accountBalance = formatBalance(accountInfo.data);
    const balance = accountBalance.transferable;

    return balance;
  }

  public async getTokenBalance(accountAddress: string, tokenAddress?: string): Promise<CodecString> {
    console.info(`[${this.constructor.name}] getTokenBalance method is not implemented`);
    return ZeroStringValue;
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    console.info(`[${this.constructor.name}] transfer method is not implemented`);
  }

  public async getNetworkFee(): Promise<CodecString> {
    console.info(`[${this.constructor.name}] getNetworkFee method is not implemented`);
    return ZeroStringValue;
  }
}

class RococoAdapter extends SubAdapter {
  public async getTokenBalance(accountAddress: string, tokenAddress?: string): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  protected getTransferExtrinsic(value: CodecString, recipient: string) {
    return this.api.tx.xcmPallet.reserveTransferAssets(
      // dest
      {
        V3: {
          parents: 0,
          interior: {
            X1: {
              Parachain: subBridgeApi.parachainIds[SubNetwork.RococoSora],
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
  }

  public async getNetworkFee(): Promise<CodecString> {
    /* Runtime call transactionPaymentApi not works, not decorated? */

    // try {
    //   const tx = this.getTransferExtrinsic(ZeroStringValue, '');
    //   const res = await tx.paymentInfo('');

    //   return new FPNumber(res.partialFee, 12).toCodecString();
    // } catch (error) {
    //   console.error(error);
    //   return ZeroStringValue;
    // }

    return ZeroStringValue;
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    const historyItem = subBridgeApi.getHistory(historyId as string) || {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: SubNetwork.Rococo,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.getTransferExtrinsic(value, recipient);

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }
}

/** Not used & tested yet */
class KusamaKaruraAdapter extends SubAdapter {
  // [TODO] fetch balance by symbol
  public async getTokenBalance(accountAddress: string, tokenAddress?: string): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    const historyItem = subBridgeApi.getHistory(historyId as string) || {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: SubNetwork.KusamaKarura,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.api.tx.xTokens.transfer(
      // currencyId: AcalaPrimitivesCurrencyCurrencyId
      {
        Token: asset.symbol,
      },
      // amount: u128 (Balance)
      value,
      // dest: XcmVersionedMultiLocation
      {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {
                Parachain: subBridgeApi.parachainIds[SubNetwork.KusamaSora],
              },
              {
                AccountId32: {
                  id: this.api.createType('AccountId32', recipient).toHex(),
                },
              },
            ],
          },
        },
      },
      // destWeightLimit
      'Unlimited'
    );

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }
}

class SubConnector {
  public readonly adapters = {
    [SubNetwork.Rococo]: () => new RococoAdapter(),
    [SubNetwork.RococoSora]: () => new SubAdapter(),
    /** Not used yet */
    // [SubNetwork.KusamaKarura]: new KusamaKaruraAdapter(),
    // [SubNetwork.KusamaSora]: new SubAdapter(),
  };

  public endpoints: SubNetworkApps = {};

  /** Adapter for Substrate network. Used for network selected in app */
  public networkAdapter!: SubAdapter;

  public getAdapterForNetwork(network: SubNetwork): SubAdapter {
    if (!(network in this.adapters)) {
      throw new Error(`[${this.constructor.name}] Adapter for "${network}" network not implemented`);
    }
    if (!(network in this.endpoints)) {
      throw new Error(`[${this.constructor.name}] Endpoint for "${network}" network is not defined`);
    }
    const endpoint = this.endpoints[network];
    const adapter = this.adapters[network]();

    adapter.setEndpoint(endpoint);

    return adapter;
  }

  /**
   * Open main connection with Substrate network
   */
  public async open(network: SubNetwork): Promise<void> {
    // stop current adapter connection
    await this.stop();
    // set adapter for network arg
    this.networkAdapter = this.getAdapterForNetwork(network);
    // open adapter connection
    await this.networkAdapter.connect();
  }

  /**
   * Close main connection to selected Substrate network
   */
  public async stop(): Promise<void> {
    await this.networkAdapter?.stop();
  }
}

export const subConnector = new SubConnector();
