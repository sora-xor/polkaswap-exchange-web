import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { computed, markRaw, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

const createNodeConnection = () => {
  const revision = shallowRef(0);
  const runtime = {
    connected: false,
    nodeAddressConnecting: '',
  };
  const apiConnection = {
    api: {
      registry: {
        chainSS58: 42,
      },
    },
  };
  const connection = {
    connection: apiConnection,
    get status() {
      void revision.value;

      return Object.freeze({
        node: null,
        nodeList: [],
        customNodes: [],
        defaultNodes: [],
        nodeAddressConnecting: runtime.nodeAddressConnecting,
        connectionAllowance: true,
        connected: runtime.connected,
      });
    },
  };

  return {
    apiConnection,
    connection,
    update(next: Partial<typeof runtime>) {
      Object.assign(runtime, next);
      revision.value += 1;
    },
  };
};

describe('SubNetworksConnector connection state', () => {
  it('lists every node catalog required by a routed parachain destination', () => {
    const connector = new SubNetworksConnector();
    (connector as any).getChains = () => ({
      soraParachain: SubNetworkId.PolkadotSora,
      relaychain: SubNetworkId.Polkadot,
      parachain: SubNetworkId.PolkadotAstar,
    });

    expect(connector.getRequiredNetworks(SubNetworkId.PolkadotAstar)).toEqual([
      SubNetworkId.PolkadotSora,
      SubNetworkId.Polkadot,
      SubNetworkId.PolkadotAstar,
    ]);
  });

  it('invalidates an early observer when a late adapter attaches and follows node readiness', async () => {
    const connector = markRaw(new SubNetworksConnector());
    const node = createNodeConnection();
    const adapter = {
      subNetwork: SubNetworkId.Liberland,
      connection: node.apiConnection,
      subNetworkConnection: node.connection,
    };
    const accountApi = {
      connection: {
        api: {},
      },
      setAccount: vi.fn(),
      setConnection: vi.fn((connection) => {
        accountApi.connection = {
          api: connection.api,
        };
      }),
      setSigner: vi.fn(),
    };

    expect(connector.connectionState).toEqual({
      network: null,
      connection: null,
      connecting: false,
      ready: false,
    });

    connector.accountApi = accountApi as never;
    (connector as any).getChains = () => ({ standalone: SubNetworkId.Liberland });
    (connector as any).getConnection = (network?: string) => (network ? adapter : undefined);

    const observedState = computed(() => connector.connectionState);
    const initialState = observedState.value;

    expect(initialState).toEqual({
      network: null,
      connection: null,
      connecting: false,
      ready: false,
    });

    await connector.init(SubNetworkId.Liberland);

    expect(observedState.value).not.toBe(initialState);
    expect(observedState.value).toEqual({
      network: SubNetworkId.Liberland,
      connection: node.connection,
      connecting: false,
      ready: false,
    });
    expect(Object.isFrozen(observedState.value)).toBe(true);

    node.update({ nodeAddressConnecting: 'wss://mainnet.liberland.org' });

    expect(observedState.value.connecting).toBe(true);
    expect(observedState.value.ready).toBe(false);

    node.update({
      connected: true,
      nodeAddressConnecting: '',
    });

    expect(observedState.value.connecting).toBe(false);
    expect(observedState.value.ready).toBe(true);

    accountApi.connection = { api: {} };
    node.update({});

    expect(observedState.value.ready).toBe(false);

    accountApi.connection = {
      api: {
        registry: {
          chainSS58: 42,
        },
      },
    };
    node.apiConnection.api = {} as never;
    node.update({});

    expect(observedState.value.ready).toBe(false);
  });

  it('keeps the previous route intact when a new routed initialization fails', async () => {
    const connector = markRaw(new SubNetworksConnector());
    const liberlandNode = createNodeConnection();
    const soraNode = createNodeConnection();
    const liberlandAdapter = {
      subNetwork: SubNetworkId.Liberland,
      connection: liberlandNode.apiConnection,
      subNetworkConnection: liberlandNode.connection,
    };
    const soraAdapter = {
      subNetwork: SubNetworkId.PolkadotSora,
      connection: soraNode.apiConnection,
      subNetworkConnection: soraNode.connection,
    };
    const accountApi = {
      account: undefined,
      signer: undefined,
      connection: undefined as unknown,
      setAccount: vi.fn(),
      setConnection: vi.fn((connection) => {
        accountApi.connection = connection;
      }),
      setSigner: vi.fn(),
    };
    let route: 'standalone' | 'parachain' = 'standalone';

    connector.accountApi = accountApi as never;
    (connector as any).getChains = () =>
      route === 'standalone'
        ? { standalone: SubNetworkId.Liberland }
        : {
            soraParachain: SubNetworkId.PolkadotSora,
            relaychain: SubNetworkId.Polkadot,
            parachain: SubNetworkId.PolkadotAstar,
          };
    (connector as any).getConnection = (network?: SubNetworkId) => {
      if (!network) return undefined;
      if (network === SubNetworkId.Liberland) return liberlandAdapter;
      if (network === SubNetworkId.PolkadotSora) return soraAdapter;

      throw new Error(`Nodes for "${network}" network are not defined`);
    };

    await connector.init(SubNetworkId.Liberland);
    const previousState = connector.connectionState;
    route = 'parachain';

    await expect(connector.init(SubNetworkId.PolkadotAstar)).rejects.toThrow(
      `Nodes for "${SubNetworkId.Polkadot}" network are not defined`
    );

    expect(connector.destinationNetwork).toBe(SubNetworkId.Liberland);
    expect(connector.standalone).toBe(liberlandAdapter);
    expect(connector.soraParachain).toBeUndefined();
    expect(connector.relaychain).toBeUndefined();
    expect(connector.parachain).toBeUndefined();
    expect(connector.network).toBe(liberlandAdapter);
    expect(connector.connectionState).toEqual(previousState);
    expect(accountApi.setConnection).toHaveBeenCalledTimes(1);
  });
});
