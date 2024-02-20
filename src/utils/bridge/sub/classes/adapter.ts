import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import type { Node } from '@/types/nodes';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';
import { determineTransferType } from '@/utils/bridge/sub/utils';

import { LiberlandAdapter } from './adapters/liberland';
import { RelaychainAdapter } from './adapters/relaychain';
import { SoraParachainAdapter } from './adapters/soraParachain';
import { SubAdapter } from './adapters/substrate';

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

  public network!: SubAdapter; // link to the one above

  public static nodes: Partial<Record<SubNetwork, Node[]>> = {};

  public readonly adapters = Object.freeze({
    [SubNetworkId.Rococo]: () => new RelaychainAdapter(SubNetworkId.Rococo),
    [SubNetworkId.Kusama]: () => new RelaychainAdapter(SubNetworkId.Kusama),
    [SubNetworkId.Polkadot]: () => new RelaychainAdapter(SubNetworkId.Polkadot),
    [SubNetworkId.RococoSora]: () => new SoraParachainAdapter(SubNetworkId.RococoSora),
    [SubNetworkId.KusamaSora]: () => new SoraParachainAdapter(SubNetworkId.KusamaSora),
    [SubNetworkId.PolkadotSora]: () => new SoraParachainAdapter(SubNetworkId.PolkadotSora),
    [SubNetworkId.Liberland]: () => new LiberlandAdapter(SubNetworkId.Liberland),
  });

  get uniqueConnections(): SubAdapter[] {
    return [this.soraParachain, this.relaychain, this.parachain, this.standalone].filter((c) => !!c) as SubAdapter[];
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

    const adapter = this.getAdapterForNetwork<Adapter>(network);
    // reuse api from connectorAdapter if possible
    this.cloneApi(adapter, connectorAdapter);

    return adapter;
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

    const nodes = SubNetworksConnector.nodes[network];

    if (!nodes) {
      throw new Error(`[${this.constructor.name}] Nodes for "${network}" network is not defined`);
    }

    const adapter = this.adapters[network]();

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
    // Create adapters
    this.standalone = this.getConnection(standalone, connector?.standalone);
    this.soraParachain = this.getConnection(soraParachain, connector?.soraParachain);
    this.relaychain = this.getConnection(relaychain, connector?.relaychain);
    this.parachain = this.getConnection(parachain, connector?.parachain);

    // link destination network
    if (this.parachain) {
      this.network = this.parachain;
    } else if (this.relaychain) {
      this.network = this.relaychain;
    } else if (this.soraParachain) {
      this.network = this.soraParachain;
    } else if (this.standalone) {
      this.network = this.standalone;
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
    await Promise.all(this.uniqueConnections.map((c) => c.connect()));
  }

  /**
   * Close connections to Substrate network & Sora parachain
   */
  public async stop(): Promise<void> {
    await Promise.all(this.uniqueConnections.map((c) => c.stop()));
  }
}

export const subBridgeConnector = new SubNetworksConnector();
