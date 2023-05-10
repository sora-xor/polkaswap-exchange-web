import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';
import compact from 'lodash/fp/compact';

import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { BridgeCurrencyType, BridgeHistory, FPNumber, Operation } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { bridgeActionContext } from '@/store/bridge';
import { MaxUint256 } from '@/consts';
import { OtherContractType, KnownEthBridgeAsset } from '@/consts/evm';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import ethersUtil, { ABI } from '@/utils/ethers-util';
import { waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import type { SignTxResult } from './types';

// ETH
import ethBridge from '@/utils/bridge/eth';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { EthBridgeHistory } from '@/utils/bridge/eth/history';
import { waitForApprovedRequest } from '@/utils/bridge/eth/utils';

// EVM
import evmBridge from '@/utils/bridge/evm';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { EvmTxStatus, EvmDirection } from '@sora-substrate/util/build/evm/consts';
import type { EvmHistory, EvmTransaction } from '@sora-substrate/util/build/evm/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

import type { IBridgeTransaction } from '@/utils/bridge/common/types';

const balanceSubscriptions = new TokenBalanceSubscriptions();

function checkEvmNetwork(context: ActionContext<any, any>): void {
  const { rootGetters } = bridgeActionContext(context);
  if (!rootGetters.web3.isValidNetwork) {
    throw new Error('Change evm network in Metamask');
  }
}

function evmTransactionToEvmHistoryItem(
  assetDataByAddress: (address: string) => Nullable<RegisteredAccountAssetWithDecimals>,
  tx: EvmTransaction
): EvmHistory {
  const id = tx.soraHash || tx.evmHash;
  const asset = assetDataByAddress(tx.soraAssetAddress);
  const transactionState = tx.status;

  // TODO [EVM] add: blockId
  return {
    id,
    txId: id,
    type: tx.direction === EvmDirection.Outgoing ? Operation.EvmOutgoing : Operation.EvmIncoming,
    hash: tx.soraHash,
    transactionState,
    externalNetwork: tx.externalNetwork,
    externalHash: tx.evmHash,
    amount: FPNumber.fromCodecValue(tx.amount, asset?.decimals).toString(),
    assetAddress: asset?.address,
    symbol: asset?.symbol,
    from: tx.soraAccount,
    to: tx.evmAccount,
    startTime: tx.startTimestamp ?? 0,
    endTime: tx.endTimestamp ?? 0,
  };
}

function evmTransactionsToEvmHistory(
  assetDataByAddress: (address: string) => Nullable<RegisteredAccountAssetWithDecimals>,
  txs: EvmTransaction[]
): Record<string, EvmHistory> {
  return txs.reduce((buffer, tx) => {
    const historyItem = evmTransactionToEvmHistoryItem(assetDataByAddress, tx);

    if (!historyItem.id) return buffer;

    return { ...buffer, [historyItem.id]: historyItem };
  }, {});
}

function bridgeDataToHistoryItem(
  context: ActionContext<any, any>,
  { date = Date.now(), payload = {}, ...params } = {}
): IBridgeTransaction {
  const { getters, state, rootState } = bridgeActionContext(context);
  const isEthBridge = getters.isEthBridge;
  const transactionState = isEthBridge ? WALLET_CONSTS.ETH_BRIDGE_STATES.INITIAL : EvmTxStatus.Pending;
  const externalNetwork = rootState.web3.evmNetworkSelected as number;

  return {
    type: (params as any).type ?? getters.operation,
    amount: (params as any).amount ?? state.amount,
    symbol: (params as any).symbol ?? getters.asset?.symbol,
    assetAddress: (params as any).assetAddress ?? getters.asset?.address,
    startTime: date,
    endTime: date,
    status: '',
    hash: '',
    transactionState,
    soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
    externalNetworkFee: (params as any).evmNetworkFee ?? getters.evmNetworkFee,
    externalNetwork,
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
      const fee = await ethersUtil.getEvmNetworkFee(getters.asset.address, state.isSoraToEvm);
      commit.getEvmNetworkFeeSuccess(fee);
    } catch (error) {
      commit.getEvmNetworkFeeFailure();
    }
  },

  async generateHistoryItem(context, playground): Promise<IBridgeTransaction> {
    const { dispatch, getters } = bridgeActionContext(context);
    const historyData = bridgeDataToHistoryItem(context, playground);
    const historyItem = getters.bridgeApi.generateHistoryItem(historyData as any);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    dispatch.updateInternalHistory();

    return historyItem;
  },

  updateInternalHistory(context): void {
    const { getters, commit } = bridgeActionContext(context);
    const history = getters.bridgeApi.history;
    commit.setInternalHistory(history as Record<string, IBridgeTransaction>);
  },

  removeHistory(context, { tx, force = false }: { tx: Partial<IBridgeTransaction>; force: boolean }): void {
    const { commit, dispatch, getters, state, rootState } = bridgeActionContext(context);

    const { hash, txId, externalHash } = tx;

    const item = (getters.bridgeApi.historyList as IBridgeTransaction[]).find(
      (item) => item.hash === hash || item.txId === txId || item.externalHash === externalHash
    );

    if (!item || !item.id) return;

    const inProgress = state.inProgressIds[item.id];
    // in not force mode, do not remove tx in progress
    if (!force && inProgress) return;
    // update in progress id if needed
    if (hash && inProgress) {
      commit.addTxIdInProgress(hash);
      commit.removeTxIdFromProgress(item.id);
    }
    // update active view if needed
    if (hash && state.historyId === item.id) {
      commit.setHistoryId(hash);
    }
    // update moonpay records if needed
    if (item.payload?.moonpayId) {
      rootState.moonpay.api.accountRecords = {
        ...rootState.moonpay.api.accountRecords,
        [item.payload.moonpayId]: item.externalHash,
      };
    }
    // remove tx from history
    getters.bridgeApi.removeHistory(item.id);

    dispatch.updateInternalHistory();
  },

  async handleBridgeTransaction(context, id: string): Promise<void> {
    const { getters } = bridgeActionContext(context);

    if (getters.isEthBridge) {
      return await ethBridge.handleTransaction(id);
    }
    if (getters.isEvmBridge) {
      return await evmBridge.handleTransaction(id);
    }
  },

  // EVM
  async updateEvmHistory(context): Promise<void> {
    const { commit, rootState, rootGetters } = bridgeActionContext(context);

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const externalNetwork = rootState.web3.evmNetworkSelected;

    if (!externalNetwork) return;

    const accountAddress = rootState.wallet.account.address;

    const transactions = await evmBridgeApi.getUserTxs(accountAddress, externalNetwork);
    const externalHistory = evmTransactionsToEvmHistory(rootGetters.assets.assetDataByAddress, transactions);

    commit.setExternalHistory(externalHistory);
  },

  async signEvmBridgeOutgoingSora(context, id: string) {
    const { rootGetters, rootDispatch } = bridgeActionContext(context);

    const tx = evmBridgeApi.getHistory(id) as EvmHistory;

    if (!tx) throw new Error(`Transaction not found: ${id}`);

    const { to, amount, assetAddress, externalNetwork } = tx;

    if (!externalNetwork) throw new Error('Transaction "externalNetwork" cannot be empty');
    if (!amount) throw new Error('Transaction "amount" cannot be empty');
    if (!assetAddress) throw new Error('Transaction "assetAddress" cannot be empty');
    if (!to) throw new Error('Transaction "to" cannot be empty');

    const asset = rootGetters.assets.assetDataByAddress(assetAddress);

    if (!asset || !asset.externalAddress) throw new Error(`Transaction asset is not registered: ${assetAddress}`);

    if (!tx.txId) {
      await rootDispatch.wallet.transactions.beforeTransactionSign();
      await evmBridgeApi.burn(asset, to, amount, externalNetwork, id);
    }
  },

  // ETH BRIDGE
  async getEthBridgeHistoryInstance(context): Promise<EthBridgeHistory> {
    const { rootState } = bridgeActionContext(context);
    const etherscanApiKey = rootState.wallet.settings.apiKeys?.etherscan;
    const bridgeHistory = new EthBridgeHistory(etherscanApiKey);

    await bridgeHistory.init();

    return bridgeHistory;
  },

  async updateEthHistory(context, clearHistory = false): Promise<void> {
    const { commit, state, dispatch, rootState, rootGetters } = bridgeActionContext(context);
    if (state.historyLoading) return;

    commit.setHistoryLoading(true);

    const bridgeHistory = await dispatch.getEthBridgeHistoryInstance();
    const address = rootState.wallet.account.address;
    const assets = rootGetters.assets.assetsDataTable;
    const networkFees = rootState.wallet.settings.networkFees;
    const contractsArray = Object.values(KnownEthBridgeAsset).map<Nullable<string>>((key) =>
      rootGetters.web3.contractAddress(key)
    );
    const contracts = compact(contractsArray);
    const updateCallback = () => dispatch.updateInternalHistory();

    if (clearHistory) {
      await bridgeHistory.clearHistory(updateCallback);
    }

    await bridgeHistory.updateAccountHistory(address, assets, networkFees, contracts, updateCallback);

    commit.setHistoryLoading(false);
  },

  async signEthBridgeOutgoingSora(context, id: string): Promise<void> {
    const { rootGetters, rootDispatch } = bridgeActionContext(context);

    const tx = ethBridgeApi.getHistory(id);

    if (!tx) throw new Error(`Transaction not found: ${id}`);

    const { to, amount, assetAddress } = tx;

    if (!amount) throw new Error('Transaction "amount" cannot be empty');
    if (!assetAddress) throw new Error('Transaction "assetAddress" cannot be empty');
    if (!to) throw new Error('Transaction "to" cannot be empty');

    const asset = rootGetters.assets.assetDataByAddress(assetAddress);

    if (!asset || !asset.externalAddress) throw new Error(`Transaction asset is not registered: ${assetAddress}`);

    await rootDispatch.wallet.transactions.beforeTransactionSign();
    await ethBridgeApi.transferToEth(asset, to, amount, id);
  },

  async signEthBridgeOutgoingEvm(context, id: string): Promise<SignTxResult> {
    const { getters, rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id) as Nullable<BridgeHistory>;

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

    const symbol = asset.symbol as KnownEthBridgeAsset;
    const evmAccount = rootState.web3.evmAddress;
    const isValOrXor = [KnownEthBridgeAsset.XOR, KnownEthBridgeAsset.VAL].includes(symbol);
    const isEthereumChain = isValOrXor;
    const bridgeAsset: KnownEthBridgeAsset = isEthereumChain ? symbol : KnownEthBridgeAsset.Other;
    const contractMap = {
      [KnownEthBridgeAsset.XOR]: rootGetters.web3.contractAbi(KnownEthBridgeAsset.XOR),
      [KnownEthBridgeAsset.VAL]: rootGetters.web3.contractAbi(KnownEthBridgeAsset.VAL),
      [KnownEthBridgeAsset.Other]: rootGetters.web3.contractAbi(KnownEthBridgeAsset.Other),
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

  async signEthBridgeIncomingEvm(context, id: string): Promise<SignTxResult> {
    const { commit, rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id);
    if (!tx?.id) throw new Error('TX cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);
    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);
    checkEvmNetwork(context);
    try {
      const contract = rootGetters.web3.contractAbi(KnownEthBridgeAsset.Other);
      const evmAccount = rootState.web3.evmAddress;
      const isExternalAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);
      if (!isExternalAccountConnected) throw new Error('Connect account in Metamask');
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other) as string;
      const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);
      // don't check allowance for native EVM token
      if (!isNativeEvmToken) {
        const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);
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
          commit.removeTxIdFromApprove(tx.id); // change ui state after approve in client
          await waitForEvmTransactionMined(transaction.hash); // wait for 1 confirm block
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
});

export default actions;
