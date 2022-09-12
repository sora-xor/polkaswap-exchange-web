import { defineActions } from 'direct-vuex';

import { web3ActionContext } from '@/store/web3';
import ethersUtil from '@/utils/ethers-util';

import type { EvmNetworkId } from '@/consts/evm';
import type { Provider } from '@/utils/ethers-util';

const actions = defineActions({
  async connectExternalAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },

  async setConnectedEvmNetwork(context, networkHex?: string): Promise<void> {
    const { commit } = web3ActionContext(context);
    const evmNetwork = networkHex ? ethersUtil.hexToNumber(networkHex) : await ethersUtil.getEvmNetworkId();
    commit.setEvmNetwork(evmNetwork);
  },

  async setSelectedEvmNetwork(context, evmNetwork: EvmNetworkId): Promise<void> {
    const { commit, getters } = web3ActionContext(context);
    commit.setSelectedEvmNetwork(evmNetwork);

    const { selectedEvmNetwork: selected, connectedEvmNetwork: connected } = getters;

    // if connected network is not equal to selected, request for provider to change network
    if (selected && connected && selected.id !== connected.id) {
      await ethersUtil.switchOrAddChain(selected);
    }
  },

  async restoreSelectedEvmNetwork(context): Promise<void> {
    const { commit, getters } = web3ActionContext(context);

    if (getters.selectedEvmNetwork) return;

    const selectedEvmNetworkId = ethersUtil.getSelectedEvmNetwork() || getters.availableEvmNetworks[0]?.id;

    if (selectedEvmNetworkId) {
      commit.setSelectedEvmNetwork(selectedEvmNetworkId);
    }
  },
});

export default actions;
