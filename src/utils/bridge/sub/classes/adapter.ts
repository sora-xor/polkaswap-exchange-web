import { WithKeyring, Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { shallowRef } from 'vue';

import type { Node } from '@/types/nodes';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubTransferType } from '@/utils/bridge/sub/types';
import { determineTransferType } from '@/utils/bridge/sub/utils';
import type { NodesConnection } from '@/utils/connection';

import { AcalaParachainAdapter } from './adapters/parachain/acala';
import { AstarParachainAdapter } from './adapters/parachain/astar';
import { CurioParachainAdapter } from './adapters/parachain/curio';
import { MoonbaseParachainAdapter } from './adapters/parachain/moonbase';
import { ParachainAdapter } from './adapters/parachain/parachain';
import { SoraParachainAdapter } from './adapters/parachain/sora';
import { AlphanetRelaychainAdapter } from './adapters/relaychain/alphanet';
import { RelaychainAdapter } from './adapters/relaychain/relaychain';
import { LiberlandAdapter } from './adapters/standalone/liberland';
import { SubAdapter } from './adapters/substrate';

import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

type PathNetworks = {
  soraParachain?: SubNetwork;
  relaychain?: SubNetwork;
  parachain?: SubNetwork;
  standalone?: SubNetwork;
};

type PathAdapters = {
  soraParachain?: SoraParachainAdapter;
  relaychain?: RelaychainAdapter;
  parachain?: ParachainAdapter<any>;
  standalone?: SubAdapter;
};

export type SubNetworkConnectionState = Readonly<{
  network: SubNetwork | null;
  connection: NodesConnection | null;
  connecting: boolean;
  ready: boolean;
}>;

const hasApiRegistry = (apiInstance: unknown): boolean => {
  return Boolean(apiInstance && typeof apiInstance === 'object' && (apiInstance as { registry?: unknown }).registry);
};

export class SubNetworksConnector {
  public soraParachain?: SoraParachainAdapter;
  public relaychain?: RelaychainAdapter;
  public parachain?: ParachainAdapter<any>;
  public standalone?: SubAdapter;

  public destinationNetwork!: SubNetwork;
  public accountApi!: WithKeyring;

  public static nodes: Partial<Record<SubNetwork, Node[]>> = {};

  /**
   * Keeps a small reactive invalidation signal beside the raw connector.
   *
   * The connector itself must stay out of Vue reactivity because it owns
   * Polkadot API instances. Consumers observe `connectionState` instead.
   */
  private readonly connectionStateRevision = shallowRef(0);

  constructor() {
    this.accountApi = new WithKeyring();
  }

  get uniqueAdapters(): SubAdapter[] {
    return [this.soraParachain, this.relaychain, this.parachain, this.standalone].filter((c) => !!c) as SubAdapter[];
  }

  get network(): SubAdapter {
    return (this.parachain ?? this.relaychain ?? this.soraParachain ?? this.standalone) as SubAdapter;
  }

  /**
   * Returns a reactive, immutable view of the selected Substrate connection.
   *
   * Reading both revision-backed status objects lets Vue invalidate consumers
   * after a late adapter attachment and after subsequent node transitions,
   * without proxying the connector, connection, or API instances.
   */
  get connectionState(): SubNetworkConnectionState {
    void this.connectionStateRevision.value;

    const adapter = this.network as SubAdapter | undefined;
    const connection = adapter?.subNetworkConnection ?? null;
    const nodeStatus = connection?.status;
    const networkApi = adapter?.connection?.api;
    const accountApi = this.accountApi?.connection?.api;

    return Object.freeze({
      network: this.destinationNetwork ?? null,
      connection,
      connecting: Boolean(nodeStatus?.nodeAddressConnecting),
      ready: Boolean(nodeStatus?.connected && hasApiRegistry(networkApi) && hasApiRegistry(accountApi)),
    });
  }

  private touchConnectionState(): void {
    this.connectionStateRevision.value += 1;
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

  /**
   * Lists every chain connection required to open the selected destination.
   *
   * Parachain transfers also need their relay chain and the matching SORA
   * parachain. Exposing this lightweight route lets startup recovery seed all
   * node lists before any raw Polkadot API adapter is constructed.
   */
  public getRequiredNetworks(network: SubNetwork): SubNetwork[] {
    return [...new Set(Object.values(this.getChains(network)).filter(Boolean) as SubNetwork[])];
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
      adapter.setApi((connectorAdapter.api as any).clone());
    }
  }

  protected getAdapter(network: SubNetwork) {
    if (subBridgeApi.isRelayChain(network)) {
      if (network === SubNetworkId.Alphanet) {
        return new AlphanetRelaychainAdapter(network);
      }
      return new RelaychainAdapter(network);
    }
    if (subBridgeApi.isParachain(network)) {
      if (network === SubNetworkId.AlphanetMoonbase) {
        return new MoonbaseParachainAdapter(network);
      }
      if (network === SubNetworkId.PolkadotAcala) {
        return new AcalaParachainAdapter(network);
      }
      if ([SubNetworkId.PolkadotAstar, SubNetworkId.KusamaShiden].includes(network)) {
        return new AstarParachainAdapter(network);
      }
      if (network === SubNetworkId.KusamaCurio) {
        return new CurioParachainAdapter(network);
      }
      if (subBridgeApi.isSoraParachain(network)) {
        return new SoraParachainAdapter(network);
      }
      return new ParachainAdapter(network);
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
   * Inject account & signer from api instance to accountApi
   */
  public setAccountFromApi(api?: WithKeyring): void {
    if (api?.account) {
      this.accountApi.setAccount(api.account);
    }
    if (api?.signer) {
      this.accountApi.setSigner(api.signer);
    }
  }

  /**
   * Initialize params for substrate networks connector
   * @param destination Destination network
   * @param connector Existing bridge connector. Api connections will be reused, if networks matches
   */
  public async init(destination: SubNetwork, connector?: SubNetworksConnector): Promise<void> {
    try {
      const { soraParachain, relaychain, parachain, standalone } = this.getChains(destination);
      // Assemble the complete route without publishing any partial state. A
      // missing relay/SORA node list can throw halfway through this work.
      const nextAdapters: PathAdapters = {
        standalone: this.getConnection(standalone, connector?.standalone),
        soraParachain: this.getConnection(soraParachain, connector?.soraParachain),
        relaychain: this.getConnection(relaychain, connector?.relaychain),
        parachain: this.getConnection(parachain, connector?.parachain),
      };
      const nextNetwork =
        nextAdapters.parachain ?? nextAdapters.relaychain ?? nextAdapters.soraParachain ?? nextAdapters.standalone;

      if (!nextNetwork || nextNetwork.subNetwork !== destination) {
        throw new Error(`[${this.constructor.name}] Adapter for "${destination}" network was not initialized`);
      }

      const previousAccountConnection = this.accountApi.connection;
      const previousAccount = this.accountApi.account;
      const previousSigner = this.accountApi.signer;

      try {
        // Prepare the account API before atomically publishing the new route.
        this.accountApi.setConnection(nextNetwork.connection);
        this.setAccountFromApi(connector?.accountApi);
      } catch (error) {
        // WithKeyring fields are raw runtime state, so restoring them directly
        // cannot trigger Vue observers or mask the original initialization error.
        this.accountApi.connection = previousAccountConnection;
        this.accountApi.account = previousAccount;
        this.accountApi.signer = previousSigner;
        throw error;
      }

      this.standalone = nextAdapters.standalone;
      this.soraParachain = nextAdapters.soraParachain;
      this.relaychain = nextAdapters.relaychain;
      this.parachain = nextAdapters.parachain;
      this.destinationNetwork = destination;
    } finally {
      // `init` commonly runs after a reactive getter has already observed an
      // empty raw connector, so adapter attachment needs an explicit signal.
      this.touchConnectionState();
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
    await Promise.all(this.uniqueAdapters.map((c) => c.connect()));
  }

  /**
   * Close connections to Substrate network & Sora parachain
   */
  public async stop(): Promise<void> {
    await Promise.all(this.uniqueAdapters.map((c) => c.stop()));
  }

  /**
   * Transfer funds from SORA to destination network
   */
  public async outgoingTransfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId: string) {
    await subBridgeApi.transfer(asset, recipient, amount, this.destinationNetwork, historyId);
  }

  /**
   * Transfer funds from destination network to SORA
   */
  public async incomingTransfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId: string) {
    if (subBridgeApi.isEvmAccount(this.destinationNetwork)) {
      await this.network.transfer(asset, recipient, amount, historyId);
    } else {
      const { api, accountPair, signer } = this.accountApi;

      if (!accountPair) throw new Error(`[${this.constructor.name}] Account pair is not set.`);

      const historyItem = subBridgeApi.getHistory(historyId as string) ?? {
        type: Operation.SubstrateIncoming,
        symbol: asset.symbol,
        assetAddress: asset.address,
        amount: `${amount}`,
        externalNetwork: this.destinationNetwork,
        externalNetworkType: BridgeNetworkType.Sub,
        from: subBridgeApi.address, // "from" is always SORA account address
        to: this.accountApi.address,
      };

      const extrinsic = this.network.getTransferExtrinsic(asset, recipient, amount);
      // submit extrinsic using SORA api, because current implementation using "subHistory" from SORA api scope
      await subBridgeApi.submitApiExtrinsic(api, extrinsic as any, accountPair, signer, historyItem);
    }
  }
}
