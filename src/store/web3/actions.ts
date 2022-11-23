import { defineActions } from 'direct-vuex';
import { BridgeNetworks, FPNumber, CodecString } from '@sora-substrate/util';
import { ethers } from 'ethers';
import type { ActionContext } from 'vuex';

import { web3ActionContext } from '@/store/web3';
import ethersUtil, {
  ABI,
  Contract,
  ContractNetwork,
  EvmNetworkTypeName,
  KnownBridgeAsset,
  OtherContractType,
  SubNetwork,
} from '@/utils/ethers-util';
import { ZeroStringValue } from '@/consts';
import { isEthereumAddress } from '@/utils';
import type { Provider } from '@/utils/ethers-util';

async function setEthSmartContracts(context: ActionContext<any, any>, network: SubNetwork): Promise<void> {
  const { commit } = web3ActionContext(context);
  const INTERNAL = await ethersUtil.readSmartContract(ContractNetwork.Ethereum, `${Contract.Internal}/MASTER.json`);
  const BRIDGE = await ethersUtil.readSmartContract(
    ContractNetwork.Ethereum,
    `${Contract.Other}/${OtherContractType.Bridge}.json`
  );
  const ERC20 = await ethersUtil.readSmartContract(
    ContractNetwork.Ethereum,
    `${Contract.Other}/${OtherContractType.ERC20}.json`
  );
  commit.setEthSmartContracts({
    address: {
      XOR: network.CONTRACTS.XOR.MASTER,
      VAL: network.CONTRACTS.VAL.MASTER,
      OTHER: network.CONTRACTS.OTHER.MASTER,
    },
    contracts: {
      XOR: INTERNAL,
      VAL: INTERNAL,
      OTHER: { BRIDGE, ERC20 },
    },
  });
}

async function setEnergySmartContracts(context: ActionContext<any, any>, network: SubNetwork): Promise<void> {
  const { commit } = web3ActionContext(context);
  const BRIDGE = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.Bridge}.json`);
  const ERC20 = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.ERC20}.json`);
  commit.setEnergySmartContracts({
    address: { OTHER: network.CONTRACTS.OTHER.MASTER },
    contracts: { OTHER: { BRIDGE, ERC20 } },
  });
}

const actions = defineActions({
  async connectExternalAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },
  async setEvmNetworkType(context, network?: string): Promise<void> {
    const { commit } = web3ActionContext(context);
    let networkType = '';
    if (!network) {
      networkType = await ethersUtil.fetchEvmNetworkType();
    } else {
      networkType = EvmNetworkTypeName[network];
    }
    commit.setNetworkType(networkType);
  },
  async setSmartContracts(context, subNetworks: Array<SubNetwork>): Promise<void> {
    for (const network of subNetworks) {
      switch (network.id) {
        case BridgeNetworks.ETH_NETWORK_ID:
          await setEthSmartContracts(context, network);
          break;
        case BridgeNetworks.ENERGY_NETWORK_ID:
          // TODO: [BRIDGE] Reduce file size
          // await setEnergySmartContracts(context, network);
          break;
      }
    }
  },
  async getEvmBalance(context): Promise<CodecString> {
    const { commit, state } = web3ActionContext(context);
    let value = ZeroStringValue;
    try {
      const address = state.evmAddress;

      if (address) {
        const ethersInstance = await ethersUtil.getEthersInstance();
        const wei = await ethersInstance.getBalance(address);
        const balance = ethers.utils.formatEther(wei.toString());
        value = new FPNumber(balance).toCodecString();
      }
    } catch (error) {
      console.error(error);
    }

    commit.setEvmBalance(value);
    return value;
  },
  async getBalanceByEvmAddress(context, assetAddress: string): Promise<{ value: CodecString; decimals: number }> {
    const { dispatch, state } = web3ActionContext(context);
    let value = ZeroStringValue;
    let decimals = 18;
    const account = state.evmAddress;
    if (!account) {
      return { value, decimals };
    }
    try {
      const ethersInstance = await ethersUtil.getEthersInstance();
      const isNativeEvmToken = isEthereumAddress(assetAddress);
      if (isNativeEvmToken) {
        value = await dispatch.getEvmBalance();
      } else {
        const tokenInstance = new ethers.Contract(assetAddress, ABI.balance, ethersInstance.getSigner());
        const methodArgs = [account];
        const balance = await tokenInstance.balanceOf(...methodArgs);
        decimals = await tokenInstance.decimals();
        value = FPNumber.fromCodecValue(balance._hex, +decimals).toCodecString();
      }
    } catch (error) {
      // We've decided not to show errors
    }

    return { value, decimals };
  },
  async getEvmTokenAddressByAssetId(context, soraAssetId: string): Promise<string> {
    const { getters } = web3ActionContext(context);
    try {
      if (!soraAssetId) {
        return '';
      }
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAbi = getters.contractAbi(KnownBridgeAsset.Other)[OtherContractType.Bridge].abi;
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other);
      if (!contractAddress || !contractAbi) {
        console.error('Contract address/abi is not found');
        return '';
      }
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, ethersInstance.getSigner());
      const methodArgs = [soraAssetId];
      const externalAddress = await contractInstance._sidechainTokens(...methodArgs);
      return externalAddress;
    } catch (error) {
      console.error(error);
      return '';
    }
  },
  async getAllowanceByEvmAddress(context, address: string): Promise<string> {
    const { getters, state } = web3ActionContext(context);
    try {
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other);
      const ethersInstance = await ethersUtil.getEthersInstance();
      const tokenInstance = new ethers.Contract(address, ABI.allowance, ethersInstance.getSigner());
      const account = state.evmAddress;
      const methodArgs = [account, contractAddress];
      const allowance = await tokenInstance.allowance(...methodArgs);
      return FPNumber.fromCodecValue(allowance._hex).toString();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
});

export default actions;
