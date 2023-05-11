import { defineActions } from 'direct-vuex';
import { initWallet, waitForCore, connection, api } from '@soramitsu/soraneo-wallet-web';
import type { ActionContext } from 'vuex';

import { settingsActionContext } from '@/store/settings';
import { Language, WalletPermissions } from '@/consts';
import { getSupportedLocale, setDayJsLocale, setI18nLocale } from '@/lang';
import { updateDocumentTitle, updateFpNumberLocale } from '@/utils';
import { AppHandledError } from '@/utils/error';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';
import type { ConnectToNodeOptions, Node } from '@/types/nodes';

const NODE_CONNECTION_TIMEOUT = 60_000;

async function updateNetworkChainGenesisHash(context: ActionContext<any, any>): Promise<void> {
  const { commit, state } = settingsActionContext(context);
  try {
    const genesisHash = await Promise.any(
      state.defaultNodes.map((node) => fetchRpc(getRpcEndpoint(node.address), 'chain_getBlockHash', [0]))
    );
    commit.setNetworkChainGenesisHash(genesisHash);
  } catch (error) {
    console.error(error);
  }
}

async function closeConnectionWithInfo() {
  const { endpoint: currentEndpoint, opened } = connection;

  if (currentEndpoint && opened) {
    await connection.close();
    console.info('Disconnected from node', currentEndpoint);
  }
}

const actions = defineActions({
  async connectToNode(context, options: ConnectToNodeOptions = {}): Promise<void> {
    const { dispatch, commit, state, rootDispatch, rootState, getters } = settingsActionContext(context);
    if (!state.nodeConnectionAllowance) return;

    const { node, onError, currentNodeIndex = 0, ...restOptions } = options;
    const defaultNode = getters.nodeList[currentNodeIndex];
    const requestedNode = (node || (state.node.address ? state.node : defaultNode)) as Nullable<Node>;
    const walletOptions = {
      permissions: WalletPermissions,
    };

    try {
      // Run in parallel
      // 1) Wallet core initialization (node connection independent)
      // 2) Connection to node
      await Promise.all([
        waitForCore(walletOptions),
        dispatch.setNode({ node: requestedNode, onError, ...restOptions }),
      ]);

      // Wallet node connection dependent logic
      if (!rootState.wallet.settings.isWalletLoaded) {
        try {
          await initWallet(walletOptions);
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
    } catch (error) {
      // if connection failed to node in state, reset node in state
      if (requestedNode && requestedNode.address === state.node.address) {
        commit.resetNode();
      }

      // loop through the node list
      if (state.node.address || currentNodeIndex !== state.defaultNodes.length - 1) {
        const nextIndex = requestedNode?.address === defaultNode.address ? currentNodeIndex + 1 : 0;
        await dispatch.connectToNode({ onError, currentNodeIndex: nextIndex, ...restOptions });
      }

      if (onError && typeof onError === 'function') {
        onError(error);
      }

      throw error;
    }
  },
  async setNode(context, options: ConnectToNodeOptions = {}): Promise<void> {
    const { dispatch, commit, state, getters } = settingsActionContext(context);
    const { node, connectionOptions = {}, onError, onDisconnect, onReconnect } = options;

    const endpoint = node?.address ?? '';
    const isTrustedEndpoint = endpoint in getters.defaultNodesHashTable;
    const connectionOpenOptions = {
      once: true, // by default we are trying to connect once, but keep trying after disconnect from connected node
      timeout: isTrustedEndpoint ? undefined : NODE_CONNECTION_TIMEOUT, // connect to trusted node without connection timeout
      ...connectionOptions,
    };
    const isReconnection = !connectionOpenOptions.once;
    const connectingNodeChanged = () => endpoint !== state.nodeAddressConnecting;

    const connectionOnDisconnected = async () => {
      await closeConnectionWithInfo();
      if (typeof onDisconnect === 'function') {
        onDisconnect(node as Node);
      }
      dispatch.connectToNode({
        node,
        onError,
        onDisconnect,
        onReconnect,
        connectionOptions: { ...connectionOpenOptions, once: false },
      });
    };

    const connectionOnReady = () => {
      connection.addEventListener('disconnected', connectionOnDisconnected);
    };

    try {
      if (!endpoint) {
        throw new Error('Node address is not set');
      }
      commit.setNodeRequest({ node, isReconnection });

      console.info('Connection request to node', endpoint);

      await closeConnectionWithInfo();

      await connection.open(endpoint, {
        ...connectionOpenOptions,
        eventListeners: [['ready', connectionOnReady]],
      });

      if (connectingNodeChanged()) return;

      console.info('Connected to node', connection.endpoint);

      const nodeChainGenesisHash = connection.api?.genesisHash.toHex();
      // if connected node is custom node, we should check genesis hash
      if (!isTrustedEndpoint) {
        // if genesis hash is not set in state, fetch it
        if (!state.chainGenesisHash) {
          await updateNetworkChainGenesisHash(context);
        }
        if (state.chainGenesisHash && nodeChainGenesisHash !== state.chainGenesisHash) {
          // disconnect from node to prevent network subscriptions activation
          await closeConnectionWithInfo();

          throw new AppHandledError(
            {
              key: 'node.errors.network',
              payload: { address: endpoint },
            },
            `Chain genesis hash doesn't match: "${nodeChainGenesisHash}" received, should be "${state.chainGenesisHash}"`
          );
        }
      } else {
        // just update genesis hash (needed for dev, test stands after their reset)
        commit.setNetworkChainGenesisHash(nodeChainGenesisHash);
      }
      if (isReconnection && typeof onReconnect === 'function') {
        onReconnect(node as Node);
      }
      commit.setNodeSuccess(node);
    } catch (error) {
      console.error(error);
      const err =
        error instanceof AppHandledError
          ? error
          : new AppHandledError({
              key: 'node.errors.connection',
              payload: { address: endpoint },
            });

      if (!connectingNodeChanged()) {
        commit.setNodeFailure();
      }
      throw err;
    }
  },
  async addCustomNode(context, node: Node): Promise<void> {
    const { commit, getters } = settingsActionContext(context);
    const nodes = [...getters.customNodes, node];
    commit.setCustomNodes(nodes);
  },
  async updateCustomNode(context, { address, node }: { address: string; node: Node }): Promise<void> {
    const { commit, getters } = settingsActionContext(context);
    const nodes = getters.customNodes.filter((item) => item.address !== address);
    commit.setCustomNodes([...nodes, node]);
  },
  async removeCustomNode(context, node: Node): Promise<void> {
    const { commit, getters } = settingsActionContext(context);
    const nodes = getters.customNodes.filter((item) => item.address !== node.address);
    commit.setCustomNodes(nodes);
  },
  async setLanguage(context, lang: Language): Promise<void> {
    const { commit } = settingsActionContext(context);
    const locale = getSupportedLocale(lang) as Language;
    // we should import dayjs locale first, then i18n
    // because i18n.locale is dependency for dayjs
    await setDayJsLocale(locale);
    await setI18nLocale(locale);
    updateDocumentTitle();
    updateFpNumberLocale(locale);
    commit.setLanguage(locale);
    commit.updateDisplayRegions(); // based on locale
  },
  async setBlockNumber(context): Promise<void> {
    const { commit } = settingsActionContext(context);
    commit.resetBlockNumberSubscription();

    const blockNumberSubscription = api.system.getBlockNumberObservable().subscribe((blockNumber) => {
      commit.setBlockNumber(blockNumber);
    });
    commit.setBlockNumberUpdates(blockNumberSubscription);
  },
});

export default actions;
