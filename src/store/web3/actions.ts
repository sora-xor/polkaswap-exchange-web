import { defineActions } from 'direct-vuex';

import { web3ActionContext } from '@/store/web3';
import ethersUtil from '@/utils/ethers-util';

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
});

export default actions;
