import compact from 'lodash/fp/compact';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';
import { BridgeCurrencyType, BridgeHistory, BridgeNetworks, FPNumber, Operation } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { bridgeActionContext } from '@/store/bridge';
import { MaxUint256 } from '@/consts';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { appBridge, bridgeApi, EthBridgeHistory, STATES, waitForApprovedRequest } from '@/utils/bridge';
import ethersUtil, { ABI, KnownBridgeAsset, OtherContractType } from '@/utils/ethers-util';
import { isEthereumAddress } from '@/utils';
import type { SignTxResult } from './types';

const balanceSubscriptions = new TokenBalanceSubscriptions();

function checkEvmNetwork(context: ActionContext<any, any>): void {
  const { rootGetters } = bridgeActionContext(context);
  if (!rootGetters.web3.isValidNetworkType) {
    throw new Error('Change evm network in Metamask');
  }
}

function bridgeDataToHistoryItem(
  context: ActionContext<any, any>,
  { date = Date.now(), step = 1, payload = {}, ...params } = {}
): BridgeHistory {
  const { getters, state, rootState } = bridgeActionContext(context);

  return {
    type: (params as any).type ?? (state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming),
    amount: (params as any).amount ?? state.amount,
    symbol: (params as any).symbol ?? getters.asset?.symbol,
    assetAddress: (params as any).assetAddress ?? getters.asset?.address,
    startTime: date,
    endTime: date,
    status: '',
    transactionStep: step as 1 | 2,
    hash: '',
    ethereumHash: '',
    transactionState: STATES.INITIAL,
    soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
    ethereumNetworkFee: (params as any).ethereumNetworkFee ?? state.evmNetworkFee,
    externalNetwork: rootState.web3.evmNetwork,
    to: (params as any).to ?? rootState.web3.evmAddress,
    payload,
  };
}

const actions = defineActions({
  async updateBalanceSubscription(context): Promise<void> {
    const { getters, commit, rootGetters } = bridgeActionContext(context);
    const updateBalance = (balance: Nullable<AccountBalance>) => commit.setAssetBalance(balance);

    balanceSubscriptions.remove('asset');

    if (
      rootGetters.wallet.account.isLoggedIn &&
      getters.asset?.address &&
      !(getters.asset.address in rootGetters.wallet.account.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('asset', { updateBalance, token: getters.asset });
    }
  },
  async resetBalanceSubscription(context): Promise<void> {
    balanceSubscriptions.remove('asset');
  },
  async setAssetAddress(context, address?: string): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);
    commit.setAssetAddress(address);
    dispatch.updateBalanceSubscription();
  },
  // Reset balance subscription & amount, but save selected asset
  async resetBridgeForm(context): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);
    dispatch.resetBalanceSubscription();
    commit.setAmount();
    commit.setSoraToEvm(true);
  },
  async updateEvmBlockNumber(context, value?: number): Promise<void> {
    const { commit } = bridgeActionContext(context);
    const blockNumber = value ?? (await (await ethersUtil.getEthersInstance()).getBlockNumber());
    commit.setEvmBlockNumber(blockNumber);
  },
  async getBridgeHistoryInstance(context): Promise<EthBridgeHistory> {
    const { rootState } = bridgeActionContext(context);
    const etherscanApiKey = rootState.wallet.settings.apiKeys?.etherscan;
    const bridgeHistory = new EthBridgeHistory(etherscanApiKey);

    await bridgeHistory.init();

    return bridgeHistory;
  },
  // TODO: Need to restore transactions for all networks
  async updateHistory(context, clearHistory = false): Promise<void> {
    const { commit, state, dispatch, rootState, rootGetters } = bridgeActionContext(context);
    if (state.historyLoading) return;

    commit.setHistoryLoading(true);

    const bridgeHistory = await dispatch.getBridgeHistoryInstance();
    const address = rootState.wallet.account.address;
    const assets = rootGetters.assets.assetsDataTable;
    const networkFees = rootState.wallet.settings.networkFees;
    const contractsArray = Object.values(KnownBridgeAsset).map<Nullable<string>>((key) =>
      rootGetters.web3.contractAddress(key)
    );
    const contracts = compact(contractsArray);
    const updateCallback = () => commit.setHistory();

    if (clearHistory) {
      await bridgeHistory.clearHistory(updateCallback);
    }

    await bridgeHistory.updateAccountHistory(address, assets, networkFees, contracts, updateCallback);

    commit.setHistoryLoading(false);
  },
  /**
   * Fetch EVM Network fee for selected bridge asset
   */
  async getEvmNetworkFee(context): Promise<void> {
    const { getters, commit, state } = bridgeActionContext(context);
    if (!getters.asset?.address) {
      return;
    }
    commit.getEvmNetworkFeeRequest();
    try {
      const fee = await ethersUtil.fetchEvmNetworkFee(getters.asset.address, state.isSoraToEvm);
      commit.getEvmNetworkFeeSuccess(fee);
    } catch (error) {
      commit.getEvmNetworkFeeFailure();
    }
  },
  async generateHistoryItem(context, playground): Promise<BridgeHistory> {
    const { commit } = bridgeActionContext(context);
    const historyData = bridgeDataToHistoryItem(context, playground);
    const historyItem = bridgeApi.generateHistoryItem(historyData);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    commit.setHistory();

    return historyItem;
  },
  async signEvmTransactionSoraToEvm(context, id: string): Promise<SignTxResult> {
    const { getters, rootState, rootGetters } = bridgeActionContext(context);
    const tx = bridgeApi.getHistory(id) as Nullable<BridgeHistory>;

    if (!tx?.hash) throw new Error('TX ID cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    checkEvmNetwork(context);

    const request = await waitForApprovedRequest(tx); // If it causes an error, then -> catch -> SORA_REJECTED

    if (!getters.isTxEvmAccount) {
      throw new Error(`Change account in MetaMask to ${request.to}`);
    }

    const ethersInstance = await ethersUtil.getEthersInstance();

    const symbol = asset.symbol as KnownBridgeAsset;
    const evmAccount = rootState.web3.evmAddress;
    const isValOrXor = [KnownBridgeAsset.XOR, KnownBridgeAsset.VAL].includes(symbol);
    const isEthereumChain = isValOrXor && rootState.web3.evmNetwork === BridgeNetworks.ETH_NETWORK_ID;
    const bridgeAsset: KnownBridgeAsset = isEthereumChain ? symbol : KnownBridgeAsset.Other;
    const contractMap = {
      [KnownBridgeAsset.XOR]: rootGetters.web3.contractAbi(KnownBridgeAsset.XOR),
      [KnownBridgeAsset.VAL]: rootGetters.web3.contractAbi(KnownBridgeAsset.VAL),
      [KnownBridgeAsset.Other]: rootGetters.web3.contractAbi(KnownBridgeAsset.Other),
    };
    const contract = contractMap[bridgeAsset];
    const jsonInterface = contract[OtherContractType.Bridge]?.abi ?? contract.abi;
    const contractAddress = rootGetters.web3.contractAddress(bridgeAsset) as string;
    const contractInstance = new ethers.Contract(contractAddress, jsonInterface, ethersInstance.getSigner());
    const method = isEthereumChain
      ? 'mintTokensByPeers'
      : request.currencyType === BridgeCurrencyType.TokenAddress
      ? 'receiveByEthereumAssetAddress'
      : 'receiveBySidechainAssetId';
    const methodArgs: Array<any> = [
      isEthereumChain || request.currencyType === BridgeCurrencyType.TokenAddress
        ? asset.externalAddress // address tokenAddress OR
        : asset.address, // bytes32 assetId
      new FPNumber(tx.amount, asset.externalDecimals).toCodecString(), // uint256 amount
      evmAccount, // address beneficiary
    ];
    methodArgs.push(
      ...(isEthereumChain
        ? [
            tx.hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
            request.from, // address from
          ]
        : [
            request.from, // address from
            tx.hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
          ])
    );
    checkEvmNetwork(context);

    const transaction: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs);

    const fee = transaction.gasPrice
      ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
      : undefined;

    return {
      hash: transaction.hash,
      fee,
    };
  },
  async signEvmTransactionEvmToSora(context, id: string): Promise<SignTxResult> {
    const { commit, rootState, rootGetters, rootDispatch } = bridgeActionContext(context);
    const tx = bridgeApi.getHistory(id);

    if (!tx?.id) throw new Error('TX cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    checkEvmNetwork(context);

    try {
      const contract = rootGetters.web3.contractAbi(KnownBridgeAsset.Other);
      const evmAccount = rootState.web3.evmAddress;
      const isExternalAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);

      if (!isExternalAccountConnected) throw new Error('Connect account in Metamask');

      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAddress = rootGetters.web3.contractAddress(KnownBridgeAsset.Other) as string;
      const isNativeEvmToken = isEthereumAddress(asset.externalAddress);

      // don't check allowance for native EVM token
      if (!isNativeEvmToken) {
        const allowance = await rootDispatch.web3.getAllowanceByEvmAddress(asset.externalAddress);
        if (FPNumber.lte(new FPNumber(allowance), new FPNumber(tx.amount))) {
          commit.addTxIdInApprove(tx.id);
          const tokenInstance = new ethers.Contract(
            asset.externalAddress,
            contract[OtherContractType.ERC20].abi,
            ethersInstance.getSigner()
          );
          const methodArgs = [
            contractAddress, // address spender
            MaxUint256, // uint256 amount
          ];
          checkEvmNetwork(context);
          const transaction = await tokenInstance.approve(...methodArgs);
          await transaction.wait(2);
          commit.removeTxIdFromApprove(tx.id);
        }
      }

      const soraAccountAddress = rootState.wallet.account.address;
      const accountId = await ethersUtil.accountAddressToHex(soraAccountAddress);
      const contractInstance = new ethers.Contract(
        contractAddress,
        contract[OtherContractType.Bridge].abi,
        ethersInstance.getSigner()
      );

      const decimals = isNativeEvmToken
        ? undefined
        : await (async () => {
            const tokenInstance = new ethers.Contract(asset.externalAddress, ABI.balance, ethersInstance.getSigner());
            const decimals = await tokenInstance.decimals();

            return +decimals;
          })();

      const amount = new FPNumber(tx.amount, decimals).toCodecString();

      const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain';
      const methodArgs = isNativeEvmToken
        ? [
            accountId, // bytes32 to
          ]
        : [
            accountId, // bytes32 to
            amount, // uint256 amount
            asset.externalAddress, // address tokenAddress
          ];

      const overrides = isNativeEvmToken ? { value: amount } : {};

      checkEvmNetwork(context);

      const transaction: ethers.providers.TransactionResponse = await contractInstance[method](
        ...methodArgs,
        overrides
      );

      const fee = transaction.gasPrice
        ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
        : undefined;

      return {
        hash: transaction.hash,
        fee,
      };
    } catch (error) {
      commit.removeTxIdFromApprove(tx.id);
      console.error(error);
      throw error;
    }
  },
  async handleBridgeTx(context, id: string): Promise<void> {
    const { commit } = bridgeActionContext(context);
    commit.addTxIdInProgress(id);

    await appBridge.handleTransaction(id);

    commit.removeTxIdFromProgress(id);
  },
});

export default actions;
