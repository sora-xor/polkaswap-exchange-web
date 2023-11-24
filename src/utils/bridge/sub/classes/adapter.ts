import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';
import type { SubNetworkApps } from '@/store/web3/types';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';
import { determineTransferType } from '@/utils/bridge/sub/utils';

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

  public setApi(api: ApiPromise): void {
    console.info(`[${this.subNetwork}] Api injected`);
    this.connection.api = api;
  }

  public async connect(): Promise<void> {
    if (!this.connected && !this.api && !this.connection.loading && this.endpoint) {
      console.info(`[${this.subNetwork}] Connection request to node:`, this.endpoint);
      await this.connection.open(this.endpoint);
      console.info(`[${this.subNetwork}] Connected to node:`, this.endpoint);
    }
    await this.api.isReady;
  }

  public async stop(): Promise<void> {
    if (this.connected) {
      await this.connection.close();
      console.info(`[${this.subNetwork}] Disconnected from node:`, this.endpoint);
    }
  }

  public getSoraParachainId(): number | undefined {
    const soraParachain = subBridgeApi.getSoraParachain(this.subNetwork);
    const soraParachainId = subBridgeApi.getParachainId(soraParachain);

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

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const historyItem = subBridgeApi.getHistory(historyId as string) || {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: this.subNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.getTransferExtrinsic(asset, recipient, amount);

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    if (!this.connected) return ZeroStringValue;

    await this.api.isReady;
    const decimals = this.api.registry.chainDecimals[0];
    const tx = this.getTransferExtrinsic(asset, recipient, ZeroStringValue);
    const res = await tx.paymentInfo(sender);
    return new FPNumber(res.partialFee, decimals).toCodecString();
  }

  public async getTokenBalance(accountAddress: string, tokenSymbol?: string): Promise<CodecString> {
    if (tokenSymbol && this.api.registry.chainTokens[0] !== tokenSymbol) return ZeroStringValue;
    return await this.getAccountBalance(accountAddress);
  }

  protected getTransferExtrinsic(
    asset: RegisteredAsset,
    recipient: string,
    amount: string | number
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }
}

class SoraParachainAdapter extends SubAdapter {
  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: CodecString) {
    return subBridgeApi.soraParachainApi.getTransferExtrinsic(asset, recipient, amount, this.api);
  }

  public async getAssetMinimumAmount(assetAddress: string): Promise<CodecString> {
    await this.connect();

    const value = await subBridgeApi.soraParachainApi.getAssetMinimumAmount(assetAddress, this.api);

    return value;
  }
}

class KusamaAdapter extends SubAdapter {
  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

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
              Fungible: value,
            },
          },
        ],
      },
      // feeAssetItem
      0
    );
  }

  /* Throws error until Substrate 5 migration */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch {
      // Hardcoded value for Rococo - 0.000125 ROC
      if (this.subNetwork === SubNetwork.Rococo) {
        return '125810197';
      }
      // Hardcoded value for Kusama - 0.0007 KSM
      return '700000000';
    }
  }
}

type SubNetworkConnection<Adapter extends SubAdapter> = {
  adapter: Adapter;
  /** If network is parachain in relaychain */
  id?: number;
};

export class SubNetworksConnector {
  public soraParachain!: SubNetworkConnection<SoraParachainAdapter>;
  public relaychain!: SubNetworkConnection<SubAdapter>;
  public network!: SubNetworkConnection<SubAdapter>;

  public static endpoints: SubNetworkApps = {};

  public readonly adapters = {
    [SubNetwork.Rococo]: () => new KusamaAdapter(SubNetwork.Rococo),
    [SubNetwork.Kusama]: () => new KusamaAdapter(SubNetwork.Kusama),
    [SubNetwork.RococoSora]: () => new SoraParachainAdapter(SubNetwork.RococoSora),
    [SubNetwork.KusamaSora]: () => new SoraParachainAdapter(SubNetwork.KusamaSora),
  };

  protected getChains(network: SubNetwork): SubNetwork[] {
    const type = determineTransferType(network);
    const soraParachain = subBridgeApi.getSoraParachain(network);
    const path: SubNetwork[] = [soraParachain];

    if (type === SubTransferType.SoraParachain) return path;

    if (type === SubTransferType.Relaychain) {
      path.push(network);
    } else {
      const relaychain = subBridgeApi.getRelayChain(network);
      path.push(relaychain, network);
    }

    return path;
  }

  protected getConnection<Adapter extends SubAdapter>(network: SubNetwork): SubNetworkConnection<Adapter> {
    if (!network) throw new Error(`[${this.constructor.name}] network is not defined`);
    return {
      adapter: this.getAdapterForNetwork(network),
      id: subBridgeApi.isRelayChain(network) ? undefined : subBridgeApi.getParachainId(network),
    };
  }

  protected cloneApi(adapter?: SubAdapter, connectorAdapter?: SubAdapter): void {
    if (!(adapter && connectorAdapter)) return;
    if (adapter.api || !connectorAdapter.api) return;

    if (connectorAdapter.subNetwork === adapter.subNetwork) {
      adapter.setApi(connectorAdapter.api.clone());
    }
  }

  public getAdapterForNetwork<T>(network: SubNetwork): T {
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

  /**
   * Initialize params for substrate networks connector
   * @param destination Destination network
   * @param connector Existing bridge connector. Api connections will be reused, if networks matches
   */
  public async init(destination: SubNetwork, connector?: SubNetworksConnector): Promise<void> {
    const [soraParachain, relaychain, parachain] = this.getChains(destination);
    // Create SORA parachain adapter
    this.soraParachain = this.getConnection(soraParachain);
    // Create adapters and link destination network
    if (parachain) {
      this.relaychain = this.getConnection(relaychain);
      this.network = this.getConnection(parachain);
    } else if (relaychain) {
      this.network = this.getConnection(relaychain);
    } else {
      this.network = this.soraParachain;
    }
    // Clone api instances, if networks matches
    if (connector) {
      this.cloneApi(this.soraParachain?.adapter, connector.soraParachain?.adapter);
      this.cloneApi(this.relaychain?.adapter, connector.relaychain?.adapter);
      this.cloneApi(this.network?.adapter, connector.network?.adapter);
    }
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
    await Promise.all([
      this.soraParachain?.adapter.connect(),
      this.relaychain?.adapter.connect(),
      this.network?.adapter.connect(),
    ]);
  }

  /**
   * Close connections to Substrate network & Sora parachain
   */
  public async stop(): Promise<void> {
    await Promise.all([
      this.soraParachain?.adapter.stop(),
      this.relaychain?.adapter?.stop(),
      this.network?.adapter?.stop(),
    ]);
  }
}

export const subBridgeConnector = new SubNetworksConnector();
