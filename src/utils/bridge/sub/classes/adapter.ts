import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';
import type { SubNetworkApps } from '@/store/web3/types';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class SubAdapter {
  protected endpoint!: string;

  public connection!: Connection;
  public readonly subNetwork!: SubNetwork;

  constructor(subNetwork: SubNetwork) {
    this.subNetwork = subNetwork;
    this.connection = new Connection({});
  }

  get api(): ApiPromise {
    return this.connection.api as ApiPromise;
  }

  get apiRx() {
    return this.api.rx as ApiRx;
  }

  get connected(): boolean {
    return !!this.api?.isConnected;
  }

  public setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  public async connect(): Promise<void> {
    if (!this.connected && this.endpoint) {
      await this.connection.open(this.endpoint);
      await this.api.isReady;
    }
  }

  public async stop(): Promise<void> {
    if (this.connected) {
      await this.connection.close();
    }
  }

  public getSoraParachainNetwork(): SubNetwork {
    return subBridgeApi.getSoraParachain(this.subNetwork);
  }

  public getSoraParachainId(): number | undefined {
    const soraParachain = this.getSoraParachainNetwork();
    const soraParachainId = subBridgeApi.parachainIds[soraParachain];

    return soraParachainId;
  }

  public async getBlockNumber(): Promise<number> {
    if (!this.connected) return 0;

    await this.api.isReady;

    const result = await this.api.query.system.number();

    return result.toNumber();
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    if (!(this.connected && accountAddress)) return ZeroStringValue;

    await this.api.isReady;

    const accountInfo = await this.api.query.system.account(accountAddress);
    const accountBalance = formatBalance(accountInfo.data);
    const balance = accountBalance.transferable;

    return balance;
  }

  public async getTokenBalance(accountAddress: string, tokenAddress?: string): Promise<CodecString> {
    throw new Error(`[${this.constructor.name}] "getTokenBalance" method is not implemented`);
  }

  protected getTransferExtrinsic(
    asset: RegisteredAsset,
    recipient: string,
    amount: CodecString
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }

  public async transfer(
    asset: RegisteredAsset,
    recipient: string,
    amount: string | number,
    historyId?: string
  ): Promise<void> {
    throw new Error(`[${this.constructor.name}] "transfer" method is not implemented`);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset): Promise<CodecString> {
    if (!this.connected) return ZeroStringValue;

    await this.api.isReady;

    const decimals = this.api.registry.chainDecimals[0];
    const tx = this.getTransferExtrinsic(asset, '', ZeroStringValue);
    const res = await tx.paymentInfo('');

    return new FPNumber(res.partialFee, decimals).toCodecString();
  }
}

class KusamaAdapter extends SubAdapter {
  public async getTokenBalance(accountAddress: string, tokenAddress?: string): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: CodecString) {
    return this.api.tx.xcmPallet.reserveTransferAssets(
      // dest
      {
        V3: {
          parents: 0,
          interior: {
            X1: {
              Parachain: this.getSoraParachainId(),
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
              Fungible: amount,
            },
          },
        ],
      },
      // feeAssetItem
      0
    );
  }

  /* Throws error until Substrate 5 migration */
  public async getNetworkFee(asset: RegisteredAsset): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset);
    } catch {
      // Hardcoded value for Kusama - 0.0007 KSM
      return '700000000';
    }
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    const historyItem = subBridgeApi.getHistory(historyId as string) || {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: this.subNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.getTransferExtrinsic(asset, recipient, value);

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }
}

export class SubNetworksConnector {
  public network!: SubNetwork;
  public parachainNetwork!: SubNetwork;
  public networkAdapter!: SubAdapter;
  public parachainAdapter!: SubAdapter;
  public parachainId!: number;

  public static endpoints: SubNetworkApps = {};

  public readonly adapters = {
    [SubNetwork.Rococo]: () => new KusamaAdapter(SubNetwork.Rococo),
    [SubNetwork.Kusama]: () => new KusamaAdapter(SubNetwork.Kusama),
    [SubNetwork.RococoSora]: () => new SubAdapter(SubNetwork.RococoSora),
    [SubNetwork.KusamaSora]: () => new SubAdapter(SubNetwork.KusamaSora),
  };

  public getAdapterForNetwork(network: SubNetwork): SubAdapter {
    if (!(network in this.adapters)) {
      throw new Error(`[${this.constructor.name}] Adapter for "${network}" network not implemented`);
    }
    if (!(network in SubNetworksConnector.endpoints)) {
      throw new Error(`[${this.constructor.name}] Endpoint for "${network}" network is not defined`);
    }
    const endpoint = SubNetworksConnector.endpoints[network];
    const adapter = this.adapters[network]();

    adapter.setEndpoint(endpoint);

    return adapter;
  }

  public async init(network: SubNetwork): Promise<void> {
    this.network = network;
    this.networkAdapter = this.getAdapterForNetwork(this.network);
    this.parachainNetwork = this.networkAdapter.getSoraParachainNetwork();
    this.parachainAdapter = this.getAdapterForNetwork(this.parachainNetwork);
    this.parachainId = this.parachainAdapter.getSoraParachainId() as number;
  }

  /**
   * Open main connection with Substrate network & Sora parachain
   */
  public async open(network: SubNetwork): Promise<void> {
    // stop current connections
    await this.stop();
    // set adapter for network arg
    await this.init(network);
    // open adapters connections
    await this.start();
  }

  /**
   * Connect to Substrate network & Sora parachain
   */
  public async start(): Promise<void> {
    await Promise.all([this.networkAdapter.connect(), this.parachainAdapter.connect()]);
  }

  /**
   * Close connections to Substrate network & Sora parachain
   */
  public async stop(): Promise<void> {
    await Promise.all([this.networkAdapter?.stop(), this.parachainAdapter?.stop()]);
  }
}

export const subBridgeConnector = new SubNetworksConnector();
