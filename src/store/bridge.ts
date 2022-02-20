import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import flatten from 'lodash/fp/flatten';
import omit from 'lodash/fp/omit';
import last from 'lodash/fp/last';
import { FPNumber, BridgeCurrencyType, BridgeNetworks, BridgeTxStatus, Operation } from '@sora-substrate/util';
import { api, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';
import type { BridgeHistory, CodecString } from '@sora-substrate/util';

import {
  bridgeApi,
  appBridge,
  STATES,
  isOutgoingTransaction,
  waitForApprovedRequest,
  getSoraHashByEthereumHash,
  getEvmTxRecieptByHash,
  getAccountEthBridgeHistoryElements,
} from '@/utils/bridge';
import ethersUtil, { ABI, KnownBridgeAsset, OtherContractType } from '@/utils/ethers-util';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { isEthereumAddress } from '@/utils';
import { MaxUint256, ZeroStringValue } from '@/consts';

const balanceSubscriptions = new TokenBalanceSubscriptions();

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SORA_TO_EVM',
    'SET_ASSET_ADDRESS',
    'SET_ASSET_BALANCE',
    'SET_AMOUNT',
    'SET_HISTORY_ITEM',
    'SET_HISTORY_RESTORATION',
    'SET_EVM_BLOCK_NUMBER',
    'ADD_TX_ID_IN_PROGRESS',
    'ADD_TX_ID_IN_APPROVE',
    'REMOVE_TX_ID_FROM_PROGRESS',
    'REMOVE_TX_ID_FROM_APPROVE',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_HISTORY', 'GET_RESTORED_FLAG', 'GET_EVM_NETWORK_FEE']);

function checkEvmNetwork(rootGetters): void {
  if (!rootGetters['web3/isValidNetworkType']) {
    throw new Error('Change evm network in Metamask');
  }
}

type AccountRequest = [number, string];

interface EthLogData {
  data: string;
  transactionHash: string;
  blockNumber: number;
}

// Withdrawal (bytes32 txHash)
const outgoingTopic = '0x0ce781a18c10c8289803c7c4cfd532d797113c4b41c9701ffad7d0a632ac555b';

async function getEthUserTXs(contracts: Array<string>, topic: string, blockHash: string): Promise<Array<EthLogData>> {
  const ethersInstance = await ethersUtil.getEthersInstance();
  const getLogs = (address: string) =>
    ethersInstance.getLogs({
      topics: [topic],
      blockHash,
      address,
    });
  const logs = flatten(await Promise.all(contracts.map((contract) => getLogs(contract))));

  return logs.map<EthLogData>(({ blockNumber, data, transactionHash }) => ({
    blockNumber,
    data,
    transactionHash,
  }));
}

function initialState() {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetBalance: null,
    amount: '',
    evmNetworkFee: ZeroStringValue,
    evmNetworkFeeFetching: false,
    evmBlockNumber: 0,
    history: [],
    historyId: '',
    historyRestoration: false,
    restored: true,
    waitingForApprove: {},
    inProgressIds: {},
  };
}

const state = initialState();

const getters = {
  asset(state, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.assetAddress);
    const balance = state.assetBalance;

    return balance ? { ...token, balance } : token;
  },
  isRegisteredAsset(state, getters) {
    return !!getters.asset?.externalAddress;
  },
  soraNetworkFee(state, getters, rootState, rootGetters) {
    // In direction EVM -> SORA sora network fee is 0, because related extrinsic calls by system automaically
    return state.isSoraToEvm ? rootGetters.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  },
  historyItem(state) {
    if (!state.historyId) return null;

    return state.history.find((item) => item.id === state.historyId) ?? null;
  },
  isTxEvmAccount(state, getters, rootState, rootGetters) {
    const historyAddress = getters.historyItem?.to;
    const currentAddress = rootGetters['web3/evmAddress'];

    return !historyAddress || ethersUtil.addressesAreEqual(historyAddress, currentAddress);
  },
};

const mutations = {
  [types.SET_SORA_TO_EVM](state, isSoraToEvm: boolean) {
    state.isSoraToEvm = isSoraToEvm;
  },
  [types.SET_ASSET_ADDRESS](state, address: string) {
    state.assetAddress = address;
  },
  [types.SET_ASSET_BALANCE](state, balance = null) {
    state.assetBalance = balance;
  },
  [types.SET_AMOUNT](state, amount: string) {
    state.amount = amount;
  },
  [types.GET_EVM_NETWORK_FEE_REQUEST](state) {
    state.evmNetworkFeeFetching = true;
  },
  [types.GET_EVM_NETWORK_FEE_SUCCESS](state, fee: CodecString) {
    state.evmNetworkFee = fee;
    state.evmNetworkFeeFetching = false;
  },
  [types.GET_EVM_NETWORK_FEE_FAILURE](state) {
    state.evmNetworkFee = ZeroStringValue;
    state.evmNetworkFeeFetching = false;
  },
  [types.GET_HISTORY_REQUEST](state) {
    state.history = null;
  },
  [types.GET_HISTORY_SUCCESS](state, history: Array<BridgeHistory>) {
    state.history = history;
  },
  [types.GET_HISTORY_FAILURE](state) {
    state.history = null;
  },
  [types.GET_RESTORED_FLAG_REQUEST](state) {
    state.restored = false;
  },
  [types.GET_RESTORED_FLAG_SUCCESS](state, restored: boolean) {
    state.restored = restored;
  },
  [types.GET_RESTORED_FLAG_FAILURE](state) {
    state.restored = false;
  },
  [types.SET_HISTORY_ITEM](state, historyId = '') {
    state.historyId = historyId;
  },
  [types.ADD_TX_ID_IN_PROGRESS](state, id: string) {
    state.inProgressIds = { ...state.inProgressIds, [id]: true };
  },
  [types.REMOVE_TX_ID_FROM_PROGRESS](state, id: string) {
    state.inProgressIds = omit([id], state.inProgressIds);
  },
  [types.ADD_TX_ID_IN_APPROVE](state, id: string) {
    state.waitingForApprove = { ...state.waitingForApprove, [id]: true };
  },
  [types.REMOVE_TX_ID_FROM_APPROVE](state, id: string) {
    state.waitingForApprove = omit([id], state.waitingForApprove);
  },
  [types.SET_EVM_BLOCK_NUMBER](state, blockNumber: number) {
    state.evmBlockNumber = blockNumber;
  },
  [types.SET_HISTORY_RESTORATION](state, flag: boolean) {
    state.historyRestoration = flag;
  },
};

const actions = {
  setSoraToEvm({ commit }, isSoraToEvm: boolean) {
    commit(types.SET_SORA_TO_EVM, isSoraToEvm);
  },
  setAssetAddress({ commit, dispatch }, address?: string) {
    commit(types.SET_ASSET_ADDRESS, address);
    dispatch('updateBalanceSubscription');
  },
  setAmount({ commit }, amount: string) {
    commit(types.SET_AMOUNT, amount);
  },
  setEvmNetworkFee({ commit }, evmNetworkFee: CodecString) {
    commit(types.GET_EVM_NETWORK_FEE_SUCCESS, evmNetworkFee);
  },
  resetBridgeForm({ dispatch }, withAddress = false) {
    dispatch('resetBalanceSubscription');
    if (!withAddress) {
      dispatch('setAssetAddress', '');
    }
    dispatch('setAmount', '');
    dispatch('setSoraToEvm', true);
  },
  resetBalanceSubscription({ commit }) {
    balanceSubscriptions.remove('asset', { updateBalance: (balance) => commit(types.SET_ASSET_BALANCE, balance) });
  },
  updateBalanceSubscription({ commit, getters, rootGetters }) {
    const updateBalance = (balance) => commit(types.SET_ASSET_BALANCE, balance);

    balanceSubscriptions.remove('asset', { updateBalance });

    if (
      rootGetters.isLoggedIn &&
      getters.asset?.address &&
      !(getters.asset.address in rootGetters.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('asset', { updateBalance, token: getters.asset });
    }
  },
  async updateEvmBlockNumber({ commit }, value?: number) {
    const blockNumber = value ?? (await (await ethersUtil.getEthersInstance()).getBlockNumber());
    commit(types.SET_EVM_BLOCK_NUMBER, blockNumber);
  },
  async getHistory({ commit }) {
    commit(types.GET_HISTORY_REQUEST);
    try {
      commit(types.GET_HISTORY_SUCCESS, bridgeApi.historyList);
    } catch (error) {
      commit(types.GET_HISTORY_FAILURE);
      throw error;
    }
  },
  async getRestoredFlag({ commit }) {
    commit(types.GET_RESTORED_FLAG_REQUEST);
    try {
      commit(types.GET_RESTORED_FLAG_SUCCESS, api.restored);
    } catch (error) {
      commit(types.GET_RESTORED_FLAG_FAILURE);
      throw error;
    }
  },

  // TODO: Need to restore transactions for all networks
  async getRestoredHistory({ rootGetters, rootState, state, dispatch, commit }) {
    try {
      commit(types.SET_HISTORY_RESTORATION, true);

      const soraAccountAddress = rootGetters.account.address;
      const historyElements = await getAccountEthBridgeHistoryElements(soraAccountAddress);

      if (!historyElements.length) {
        commit(types.SET_HISTORY_RESTORATION, false);
        return;
      }

      const externalNetwork = BridgeNetworks.ETH_NETWORK_ID;
      const contracts = Object.values(KnownBridgeAsset).map<string>((key) => rootGetters['web3/contractAddress'](key));
      // ethereum data
      const ethBlockLogsMap: { [key: string]: Promise<EthLogData[]> } = {};
      const ethAccountTransactionsMap: { [key: string]: Promise<ethers.providers.TransactionResponse[]> } = {};
      const ethTransactionsMap: { [key: string]: ethers.providers.TransactionResponse } = {};
      /// etherscan
      const ethersInstance = await ethersUtil.getEthersInstance();
      const network = await ethersInstance.getNetwork();
      const etherscanApiKey = rootState.Settings.apiKeys?.etherscan;
      const etherscanInstance = new ethers.providers.EtherscanProvider(network, etherscanApiKey);
      // find eth start block using the last historyElement
      const ethStartTimestamp = last(historyElements)?.timestamp as number;
      const ethStartBlock = await etherscanInstance.fetch('block', {
        action: 'getblocknobytime',
        timestamp: ethStartTimestamp,
        closest: 'before',
      });

      const getAccountTransactions = async (address: string): Promise<Array<ethers.providers.TransactionResponse>> => {
        if (!ethAccountTransactionsMap[address]) {
          ethAccountTransactionsMap[address] = etherscanInstance.getHistory(address, ethStartBlock).then((history) => {
            return history.reduce<ethers.providers.TransactionResponse[]>((buffer, tx) => {
              const matches = !!tx.to && contracts.includes(tx.to.toLowerCase());

              if (matches) {
                buffer.push(tx);
                ethTransactionsMap[tx.hash] = tx;
              }

              return buffer;
            }, []);
          });
        }

        return await ethAccountTransactionsMap[address];
      };

      const getBlockLogs = async (blockHash: string, contract: string): Promise<EthLogData[]> => {
        if (!ethBlockLogsMap[blockHash]) {
          ethBlockLogsMap[blockHash] = getEthUserTXs([contract], outgoingTopic, blockHash);
        }
        return await ethBlockLogsMap[blockHash];
      };

      const findOutgoingEthTxBySoraHash = async (
        address: string,
        hash: string
      ): Promise<ethers.providers.TransactionResponse | null> => {
        const transactions = await getAccountTransactions(address);
        try {
          return await Promise.any(
            transactions.map(async (tx) => {
              const logs = await getBlockLogs(tx.blockHash as string, tx.to as string);
              if (!logs.find((item) => item.data === hash)) throw new Error();
              return tx;
            })
          );
        } catch (error) {
          return null;
        }
      };

      const findIncomingEthTxByEthereumHash = async (
        ethereumHash: string
      ): Promise<ethers.providers.TransactionResponse> => {
        return ethTransactionsMap[ethereumHash] || (await ethersUtil.getEvmTransaction(ethereumHash));
      };

      // Bridge history restoration process
      // Show transaction in history after processing
      for (const historyElement of historyElements) {
        const type =
          historyElement.module === SUBQUERY_TYPES.ModuleNames.BridgeMultisig
            ? Operation.EthBridgeIncoming
            : Operation.EthBridgeOutgoing;
        const isOutgoing = isOutgoingTransaction({ type });
        const historyElementData = historyElement.data as SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing &
          SUBQUERY_TYPES.HistoryElementEthBridgeIncoming;
        const requestHash = historyElementData.requestHash;

        const historyItem = state.history.find((item: BridgeHistory) =>
          isOutgoing ? item.hash === requestHash : item.ethereumHash === requestHash
        );

        if (historyItem) continue;

        const hash = isOutgoing ? requestHash : await getSoraHashByEthereumHash(externalNetwork, requestHash);
        const amount = historyElementData.amount;
        const assetAddress = historyElementData.assetId;
        const from = soraAccountAddress;
        const symbol = rootGetters['assets/assetsDataTable'][assetAddress]?.symbol;
        const blockId = historyElement.blockHash;
        const txId = historyElement.id;
        const soraNetworkFee = isOutgoing ? rootGetters.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
        const soraTimestamp = historyElement.timestamp * 1000;
        const soraPartCompleted =
          !isOutgoing ||
          (await bridgeApi.api.query.ethBridge.requestStatuses(externalNetwork, hash)).toString() ===
            BridgeTxStatus.Ready;
        const transactionStep = soraPartCompleted ? 2 : 1;

        const ethereumTx = isOutgoing
          ? await findOutgoingEthTxBySoraHash(historyElementData.sidechainAddress, hash)
          : await findIncomingEthTxByEthereumHash(requestHash);

        const ethereumHash = ethereumTx?.hash ?? '';
        const recieptData = await getEvmTxRecieptByHash(ethereumHash);

        const to = isOutgoing ? historyElementData.sidechainAddress : recieptData?.from;
        const ethereumNetworkFee = recieptData?.ethereumNetworkFee;
        const blockHeight = ethereumTx ? String(ethereumTx.blockNumber) : undefined;
        const evmTimestamp = ethereumTx?.timestamp ? ethereumTx.timestamp * 1000 : Date.now();

        const [startTime, endTime] = isOutgoing ? [soraTimestamp, evmTimestamp] : [evmTimestamp, soraTimestamp];

        const transactionState = isOutgoing
          ? ethereumHash
            ? STATES.EVM_COMMITED
            : soraPartCompleted
            ? STATES.EVM_REJECTED
            : STATES.SORA_PENDING
          : STATES.SORA_COMMITED;

        const status = isOutgoing
          ? ethereumHash
            ? BridgeTxStatus.Done
            : soraPartCompleted
            ? BridgeTxStatus.Failed
            : BridgeTxStatus.Pending
          : BridgeTxStatus.Done;

        bridgeApi.generateHistoryItem({
          txId,
          type,
          blockId,
          blockHeight,
          from,
          amount,
          symbol,
          assetAddress,
          startTime,
          endTime,
          status,
          transactionStep,
          hash,
          ethereumHash,
          soraNetworkFee,
          ethereumNetworkFee,
          transactionState,
          externalNetwork,
          to,
        });

        await dispatch('getHistory');
      }
    } catch (error) {
      console.error(error);
    } finally {
      commit(types.SET_HISTORY_RESTORATION, false);
    }
  },

  setHistoryItem({ commit }, historyId = '') {
    commit(types.SET_HISTORY_ITEM, historyId);
  },

  clearHistory({ commit }) {
    bridgeApi.clearHistory();
    commit(types.GET_HISTORY_SUCCESS, []);
  },
  /**
   * Fetch EVM Network fee for selected bridge asset
   */
  async getEvmNetworkFee({ commit, getters, state }) {
    if (!getters.asset || !getters.asset.address) {
      return;
    }
    commit(types.GET_EVM_NETWORK_FEE_REQUEST);
    try {
      const fee = await ethersUtil.fetchEvmNetworkFee(getters.asset.address, state.isSoraToEvm);
      commit(types.GET_EVM_NETWORK_FEE_SUCCESS, fee);
    } catch (error) {
      commit(types.GET_EVM_NETWORK_FEE_FAILURE);
    }
  },

  bridgeDataToHistoryItem(
    { getters, rootGetters, state },
    { date = Date.now(), step = 1, payload = {}, ...params } = {}
  ) {
    return {
      type: (params as any).type ?? (state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming),
      amount: (params as any).amount ?? state.amount,
      symbol: (params as any).symbol ?? getters.asset.symbol,
      assetAddress: (params as any).assetAddress ?? getters.asset.address,
      startTime: date,
      endTime: date,
      status: '',
      transactionStep: step,
      hash: '',
      ethereumHash: '',
      transactionState: STATES.INITIAL,
      soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
      ethereumNetworkFee: (params as any).ethereumNetworkFee ?? state.evmNetworkFee,
      externalNetwork: rootGetters['web3/evmNetwork'],
      to: (params as any).to ?? rootGetters['web3/evmAddress'],
      payload,
    };
  },

  async generateHistoryItem({ dispatch }, playground) {
    const historyData = await dispatch('bridgeDataToHistoryItem', playground);
    const historyItem = bridgeApi.generateHistoryItem(historyData);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    await dispatch('getHistory');

    return historyItem;
  },

  async signEvmTransactionSoraToEvm({ getters, rootGetters }, id: string) {
    const tx = bridgeApi.getHistory(id) as BridgeHistory;

    if (!tx || !tx.hash) throw new Error('TX ID cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters['assets/getAssetDataByAddress'](tx.assetAddress);

    if (!asset.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    checkEvmNetwork(rootGetters);

    const request = await waitForApprovedRequest(tx); // If it causes an error, then -> catch -> SORA_REJECTED

    if (!getters.isTxEvmAccount) {
      throw new Error(`Change account in MetaMask to ${request.to}`);
    }

    const ethersInstance = await ethersUtil.getEthersInstance();

    const symbol = asset.symbol;
    const evmAccount = rootGetters['web3/evmAddress'];
    const isValOrXor = [KnownBridgeAsset.XOR, KnownBridgeAsset.VAL].includes(symbol);
    const isEthereumChain = isValOrXor && rootGetters['web3/evmNetwork'] === BridgeNetworks.ETH_NETWORK_ID;
    const bridgeAsset: KnownBridgeAsset = isEthereumChain ? symbol : KnownBridgeAsset.Other;
    const contractMap = {
      [KnownBridgeAsset.XOR]: rootGetters['web3/contractAbi'](KnownBridgeAsset.XOR),
      [KnownBridgeAsset.VAL]: rootGetters['web3/contractAbi'](KnownBridgeAsset.VAL),
      [KnownBridgeAsset.Other]: rootGetters['web3/contractAbi'](KnownBridgeAsset.Other),
    };
    const contract = contractMap[bridgeAsset];
    const jsonInterface = contract[OtherContractType.Bridge]?.abi ?? contract.abi;
    const contractAddress = rootGetters['web3/contractAddress'](bridgeAsset);
    const contractInstance = new ethers.Contract(contractAddress, jsonInterface, ethersInstance.getSigner());
    const method = isEthereumChain
      ? 'mintTokensByPeers'
      : request.currencyType === BridgeCurrencyType.TokenAddress
      ? 'receiveByEthereumAssetAddress'
      : 'receiveBySidechainAssetId';
    const methodArgs = [
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
    checkEvmNetwork(rootGetters);

    const transaction: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs);

    const fee = transaction.gasPrice
      ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
      : undefined;

    return {
      hash: transaction.hash,
      fee,
    };
  },

  async signEvmTransactionEvmToSora({ commit, rootGetters, dispatch }, id: string) {
    const tx = bridgeApi.getHistory(id);

    if (!tx) throw new Error('TX cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters['assets/getAssetDataByAddress'](tx.assetAddress);

    if (!asset.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    checkEvmNetwork(rootGetters);

    try {
      const contract = rootGetters['web3/contractAbi'](KnownBridgeAsset.Other);
      const evmAccount = rootGetters['web3/evmAddress'];
      const isExternalAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);

      if (!isExternalAccountConnected) throw new Error('Connect account in Metamask');

      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAddress = rootGetters['web3/contractAddress'](KnownBridgeAsset.Other);
      const isNativeEvmToken = isEthereumAddress(asset.externalAddress);

      // don't check allowance for native EVM token
      if (!isNativeEvmToken) {
        const allowance = await dispatch(
          'web3/getAllowanceByEvmAddress',
          { address: asset.externalAddress },
          { root: true }
        );
        if (FPNumber.lte(new FPNumber(allowance), new FPNumber(tx.amount))) {
          commit(types.ADD_TX_ID_IN_APPROVE, tx.id);
          const tokenInstance = new ethers.Contract(
            asset.externalAddress,
            contract[OtherContractType.ERC20].abi,
            ethersInstance.getSigner()
          );
          const methodArgs = [
            contractAddress, // address spender
            MaxUint256, // uint256 amount
          ];
          checkEvmNetwork(rootGetters);
          const transaction = await tokenInstance.approve(...methodArgs);
          await transaction.wait(2);
          commit(types.REMOVE_TX_ID_FROM_APPROVE, tx.id);
        }
      }

      const soraAccountAddress = rootGetters.account.address;
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

      checkEvmNetwork(rootGetters);

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
      commit(types.REMOVE_TX_ID_FROM_APPROVE, tx.id);
      console.error(error);
      throw error;
    }
  },

  async handleBridgeTx({ commit }, id: string) {
    commit(types.ADD_TX_ID_IN_PROGRESS, id);

    await appBridge.handleTransaction(id);

    commit(types.REMOVE_TX_ID_FROM_PROGRESS, id);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
