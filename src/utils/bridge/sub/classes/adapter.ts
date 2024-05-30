import { ApiAccount, Operation, Storage } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import type { Node } from '@/types/nodes';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';
import { determineTransferType } from '@/utils/bridge/sub/utils';

import { AcalaParachainAdapter } from './adapters/parachain/acala';
import { MoonbaseParachainAdapter } from './adapters/parachain/moonbase';
import { SoraParachainAdapter } from './adapters/parachain/sora';
import { RelaychainAdapter } from './adapters/relaychain';
import { LiberlandAdapter } from './adapters/standalone/liberland';
import { SubAdapter } from './adapters/substrate';

import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';

type PathNetworks = {
  soraParachain?: SubNetwork;
  relaychain?: SubNetwork;
  parachain?: SubNetwork;
  standalone?: SubNetwork;
};

export class SubNetworksConnector {
  public soraParachain?: SoraParachainAdapter;
  public relaychain?: SubAdapter;
  public parachain?: SubAdapter;
  public standalone?: SubAdapter;

  public destinationNetwork!: SubNetwork;
  public accountApi!: ApiAccount;

  public static nodes: Partial<Record<SubNetwork, Node[]>> = {};

  constructor() {
    this.accountApi = new ApiAccount('subHistory');
    this.accountApi.setStorage(new Storage());
  }

  get uniqueAdapters(): SubAdapter[] {
    return [this.soraParachain, this.relaychain, this.parachain, this.standalone].filter((c) => !!c) as SubAdapter[];
  }

  get network(): SubAdapter {
    return (this.parachain ?? this.relaychain ?? this.soraParachain ?? this.standalone) as SubAdapter;
  }

  protected getChains(network: SubNetwork): PathNetworks {
    const path: PathNetworks = {};
    const type = determineTransferType(network);

    if (type === SubTransferType.Standalone) {
      path.standalone = network;
      return path;
    }

    path.soraParachain = subBridgeApi.getSoraParachain(network);

    if (type === SubTransferType.SoraParachain) return path;

    if (type === SubTransferType.Relaychain) {
      path.relaychain = network;
    } else {
      path.relaychain = subBridgeApi.getRelayChain(network);
      path.parachain = network;
    }

    return path;
  }

  protected getConnection<Adapter extends SubAdapter>(
    network?: SubNetwork,
    connectorAdapter?: Adapter
  ): Adapter | undefined {
    if (!network) return undefined;

    const adapter = this.getAdapterForNetwork(network);
    // reuse api from connectorAdapter if possible
    this.cloneApi(adapter, connectorAdapter);

    return adapter as Adapter;
  }

  protected cloneApi(adapter?: SubAdapter, connectorAdapter?: SubAdapter): void {
    if (!(adapter && connectorAdapter)) return;
    if (adapter.api || !connectorAdapter.api) return;

    if (connectorAdapter.subNetwork === adapter.subNetwork) {
      adapter.setApi(connectorAdapter.api.clone());
    }
  }

  protected getAdapter(network: SubNetwork) {
    if (subBridgeApi.isRelayChain(network)) {
      return new RelaychainAdapter(network);
    }
    if (subBridgeApi.isParachain(network)) {
      if (network === SubNetworkId.AlphanetMoonbase) {
        return new MoonbaseParachainAdapter(network);
      }
      if (network === SubNetworkId.PolkadotAcala) {
        return new AcalaParachainAdapter(network);
      }
      if (subBridgeApi.isSoraParachain(network)) {
        return new SoraParachainAdapter(network);
      }
    }
    if (subBridgeApi.isStandalone(network)) {
      if (network === SubNetworkId.Liberland) {
        return new LiberlandAdapter(network);
      }
    }

    console.info(`[${this.constructor.name}] Adapter for "${network}" network not implemented, "SubAdapter" is used`);

    return new SubAdapter(network);
  }

  public getAdapterForNetwork(network: SubNetwork) {
    const adapter = this.getAdapter(network);
    const nodes = SubNetworksConnector.nodes[network];

    if (!nodes) {
      throw new Error(`[${this.constructor.name}] Nodes for "${network}" network is not defined`);
    }

    adapter.subNetworkConnection.setDefaultNodes(nodes);

    return adapter;
  }

  /**
   * Initialize params for substrate networks connector
   * @param destination Destination network
   * @param connector Existing bridge connector. Api connections will be reused, if networks matches
   */
  public async init(destination: SubNetwork, connector?: SubNetworksConnector): Promise<void> {
    const { soraParachain, relaychain, parachain, standalone } = this.getChains(destination);
    this.destinationNetwork = destination;
    // Create adapters
    this.standalone = this.getConnection(standalone, connector?.standalone);
    this.soraParachain = this.getConnection(soraParachain, connector?.soraParachain);
    this.relaychain = this.getConnection(relaychain, connector?.relaychain);
    this.parachain = this.getConnection(parachain, connector?.parachain);

    if (connector?.accountApi) {
      this.accountApi = connector.accountApi;
    }
    // Link destination network connection to accountApi
    this.accountApi.setConnection(this.network.connection);
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
    await Promise.all(this.uniqueAdapters.map((c) => c.connect()));
  }

  /**
   * Close connections to Substrate network & Sora parachain
   */
  public async stop(): Promise<void> {
    await Promise.all(this.uniqueAdapters.map((c) => c.stop()));
  }

  /**
   * Transfer funds from destination network
   */
  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const accountPair = this.accountApi.accountPair;

    console.log(this.accountApi);

    if (!accountPair) throw new Error(`[${this.constructor.name}] Account pair is not set.`);

    const historyItem = this.accountApi.getHistory(historyId as string) ?? {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: this.destinationNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.network.getTransferExtrinsic(asset, recipient, amount);

    await this.accountApi.submitExtrinsic(extrinsic, accountPair, historyItem);
  }
}
