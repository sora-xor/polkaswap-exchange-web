/* eslint-disable no-console */
import { defineActions } from 'direct-vuex';
import { routeAssetsActionContext } from '@/store/routeAssets';
import Papa from 'papaparse';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { getPathsAndPairLiquiditySources } from '@sora-substrate/liquidity-proxy';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { RouteAssetsSubscription, RecipientStatus } from './types';
import { FPNumber, Operation } from '@sora-substrate/util/build';
import { formatAddress, getAssetBalance, delay } from '@/utils';
import type { DexQuoteData } from '@/store/swap/types';
import { DexId } from '@sora-substrate/util/build/dex/consts';
import type { QuotePayload, SwapResult } from '@sora-substrate/liquidity-proxy/build/types';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { findLast, groupBy, sumBy } from 'lodash';
import { NumberLike } from '@sora-substrate/math';
import { Messages } from '@sora-substrate/util/build/logger';
import { assert } from '@polkadot/util';

const actions = defineActions({
  processingNextStage(context) {
    const { commit } = routeAssetsActionContext(context);
    commit.progressCurrentStageIndex(1);
  },
  processingPreviousStage(context) {
    const { commit } = routeAssetsActionContext(context);
    commit.progressCurrentStageIndex(-1);
  },
  setInputToken(context, asset) {
    const { commit, dispatch } = routeAssetsActionContext(context);
    commit.setInputToken(asset);
    dispatch.subscribeOnReserves();
  },
  cancelProcessing(context) {
    const { commit, rootGetters, dispatch } = routeAssetsActionContext(context);
    dispatch.cleanSwapReservesSubscription();
    commit.clearData();
  },
  async updateRecipients(context, file?: File): Promise<void> {
    const { commit, rootGetters, dispatch, rootState } = routeAssetsActionContext(context);
    if (!file) {
      commit.clearData();
      return;
    }
    const assetsTable = rootState.wallet.account.whitelistArray;
    const findAsset = (assetName: string) => {
      return assetsTable.find((item: Asset) => item.symbol === assetName.toUpperCase());
    };

    const data: Array<any> = [];
    const priceObject = rootState.wallet.account.fiatPriceObject;

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        comments: '//',
        step: (row, parser) => {
          // console.log((row.meta.cursor / file.size) * 100);
          try {
            const usd = row.data[2]?.replace(/,/g, '');
            const asset = findAsset(row.data[3]);
            const amount = Number(usd) / Number(getAssetUSDPrice(asset, priceObject));
            data.push({
              name: row.data[0],
              wallet: row.data[1],
              usd: usd,
              asset: asset,
              amount: amount,
              status: api.validateAddress(row.data[1])
                ? RecipientStatus.ADDRESS_VALID
                : RecipientStatus.ADDRESS_INVALID,
              id: (crypto as any).randomUUID(),
              isCompleted: false,
            });
          } catch (error) {
            parser.abort();
          }
        },
        complete: ({ errors }) => {
          if (errors.length < 1) {
            resolve();
            commit.setData({ file, recipients: data });
            dispatch.subscribeOnReserves();
          } else {
            reject(new Error('Parcing failed'));
          }
        },
      });
    });
  },

  editRecipient(context, { id, name, wallet, usd, asset }): void {
    const { commit, rootState } = routeAssetsActionContext(context);
    const priceObject = rootState.wallet.account.fiatPriceObject;
    const amount = Number(usd) / Number(getAssetUSDPrice(asset, priceObject));
    commit.editRecipient({ id, name, wallet, usd, amount, asset });
  },

  deleteRecipient(context, id): void {
    const { commit, rootState } = routeAssetsActionContext(context);
    commit.deleteRecipient(id);
  },

  subscribeOnReserves(context, tkn: Asset = XOR): void {
    const { commit, rootGetters, getters, dispatch } = routeAssetsActionContext(context);
    const liquiditySources = rootGetters.swap.swapLiquiditySource;
    const sourceToken = getters.inputToken;
    const tokens = [...new Set<Asset>(getters.recipients.filter((item) => item.asset).map((item) => item.asset))]
      .map((item: Asset) => item?.address)
      .filter((item) => item !== sourceToken.address);
    if (!tokens || tokens.length < 1) return;
    const currentsPulls = [] as Array<RouteAssetsSubscription>;

    dispatch.cleanSwapReservesSubscription();
    const enabledAssetsSubscription = api.swap
      .subscribeOnPrimaryMarketsEnabledAssets()
      .subscribe((enabledAssetsList) => {
        commit.setPrimaryMarketsEnabledAssets(enabledAssetsList);
        tokens.forEach(async (tokenAddress) => {
          const reservesSubscribe = api.swap
            .subscribeOnAllDexesReserves(
              sourceToken.address,
              tokenAddress,
              enabledAssetsList,
              liquiditySources as LiquiditySourceTypes
            )
            .subscribe((results) => {
              results.forEach((result) =>
                dispatch.setSubscriptionPayload({
                  data: result,
                  inputAssetId: sourceToken.address,
                  outputAssetId: tokenAddress,
                })
              );
            });
          currentsPulls.push({
            liquidityReservesSubscription: reservesSubscribe,
            payload: null,
            paths: null,
            liquiditySources: null,
            assetAddress: tokenAddress,
          });
        });
      });
    commit.setSubscriptions(currentsPulls);
    commit.setEnabledAssetsSubscription(enabledAssetsSubscription);
  },

  async setSubscriptionPayload(context, { data, inputAssetId, outputAssetId }): Promise<void> {
    const { state, rootState, getters, commit, dispatch } = routeAssetsActionContext(context);

    const { dexId, payload } = data;
    // tbc & xst is enabled only on dex 0
    if (!(inputAssetId && outputAssetId && payload)) {
      return;
    }

    // tbc & xst is enabled only on dex 0
    const enabledAssets = dexId === DexId.XOR ? state.enabledAssets : { tbc: [], xst: [], lockedSources: [] };
    const baseAssetId = api.dex.getBaseAssetId(dexId);
    const syntheticBaseAssetId = api.dex.getSyntheticBaseAssetId(dexId);

    const { paths, liquiditySources } = getPathsAndPairLiquiditySources(
      payload,
      enabledAssets,
      baseAssetId,
      syntheticBaseAssetId
    );

    const subscription = state.subscriptions.find((item) => item.assetAddress === outputAssetId);
    if (subscription) {
      subscription.paths = paths;
      subscription.liquiditySources = liquiditySources;
      subscription.payload = payload;
      subscription.dexId = dexId;
      subscription.dexQuoteData = {
        ...subscription.dexQuoteData,
        [dexId]: Object.freeze({
          payload,
          paths,
          pairLiquiditySources: liquiditySources,
        }),
      };
    }
    dispatch.updateTokenAmounts();
  },

  updateTokenAmounts(context): void {
    const { state, rootState, getters, commit } = routeAssetsActionContext(context);
    const priceObject = rootState.wallet.account.fiatPriceObject;
    const recipients = getters.recipients;
    recipients.forEach((recipient) => {
      const amount = Number(recipient.usd) / Number(getAssetUSDPrice(recipient.asset, priceObject));
      commit.setRecipientTokenAmount({ id: recipient.id, amount });
    });
  },

  async repeatTransaction(context, id): Promise<void> {
    const { getters, commit, rootCommit } = routeAssetsActionContext(context);
    const inputAsset = getters.inputToken;
    const recipient = getters.recipients.find((recipient) => recipient.id === id);
    if (!recipient) {
      return Promise.reject(new Error('Cant find transaction by this Id'));
    }
    commit.setRecipientStatus({
      id: recipient.id,
      status: RecipientStatus.PENDING,
    });
    const transferParams = getTransferParams(context, inputAsset, recipient);
    if (!transferParams) return Promise.reject(new Error('Cant find transaction by this Id'));
    const action = transferParams.action;
    try {
      if (!action) throw new Error('Cant get transfer params');
      const time = Date.now();
      await action()
        .then(async () => {
          const lastTx = await getLastTransaction(time);
          rootCommit.wallet.transactions.addActiveTx(lastTx.id as string);
          commit.setRecipientTxId({
            id: recipient.id,
            txId: lastTx.id,
          });
        })
        .catch(() => {
          commit.setRecipientStatus({
            id: recipient.id,
            status: RecipientStatus.FAILED,
          });
          return Promise.reject(new Error('Transaction failed'));
        });
    } catch (e) {
      commit.setRecipientStatus({
        id: recipient.id,
        status: RecipientStatus.FAILED,
      });
      return Promise.reject(new Error('Transaction failed'));
    }
  },

  async runAssetsRouting(context): Promise<void> {
    const { getters, commit } = routeAssetsActionContext(context);
    const inputAsset = getters.inputToken;
    const data = getters.incompletedRecipients.map((recipient) => {
      commit.setRecipientStatus({
        id: recipient.id,
        status: RecipientStatus.PENDING,
      });
      return getTransferParams(context, inputAsset, recipient);
    });
    const transfers = data.filter((item) => item?.transfer);
    const swapAndSend = data.filter((item) => !item?.transfer);

    await executeBatchSwapAndSend(context, swapAndSend);
    await executeTransfer(context, transfers);
  },

  cleanSwapReservesSubscription(context): void {
    const { state, commit } = routeAssetsActionContext(context);
    const subscriptions = state.subscriptions;
    subscriptions.forEach((sub) => {
      sub.liquidityReservesSubscription.unsubscribe();
    });
    commit.setSubscriptions([]);
    commit.cleanEnabledAssetsSubscription();
  },
});

function getAssetUSDPrice(asset, fiatPriceObject) {
  if (!asset) return null;
  return FPNumber.fromCodecValue(fiatPriceObject[asset.address], 18).toFixed(18);
}

function getTransferParams(context, inputAsset, recipient) {
  const { rootState, getters, rootGetters } = routeAssetsActionContext(context);
  if (recipient.asset.address === inputAsset.address) {
    const priceObject = rootState.wallet.account.fiatPriceObject;
    const amount = Number(recipient.usd) / Number(getAssetUSDPrice(recipient.asset, priceObject));
    const transfer = api.api.tx.assets.transfer(
      inputAsset.address,
      recipient.wallet,
      new FPNumber(amount, inputAsset.decimals).toCodecString()
    );
    const formattedToAddress =
      recipient.wallet.slice(0, 2) === 'cn' ? recipient.wallet : formatAddress(recipient.wallet);
    const history = {
      symbol: recipient.asset.symbol,
      to: formattedToAddress,
      amount: `${amount}`,
      assetAddress: recipient.wallet,
      type: Operation.Transfer,
    };
    return {
      action: async () => await api.transfer(recipient.asset, recipient.wallet, amount),
      recipient,
      transfer: {
        extrinsic: transfer,
        history: history,
      },
    };
  } else {
    const subscription = getters.subscriptions.find((sub) => sub.assetAddress === recipient.asset.address);
    if (!subscription) return null;
    const { paths, payload, liquiditySources, dexQuoteData } = subscription;
    const tokenEquivalent =
      Number(recipient.usd) /
      Number(FPNumber.fromCodecValue(rootState.wallet.account.fiatPriceObject[recipient.asset.address], 18));
    const dexes = api.dex.dexList;

    try {
      // TODO: [ARCH] Asset -> Asset | AccountAsset
      const results = dexes.reduce<{ [dexId: number]: SwapResult }>((buffer, { dexId }) => {
        const swapResult = api.swap.getResult(
          inputAsset,
          recipient.asset,
          `${tokenEquivalent}`,
          true,
          [rootGetters.swap.swapLiquiditySource].filter(Boolean) as Array<LiquiditySourceTypes>,
          (dexQuoteData as Record<DexId, DexQuoteData>)[dexId].paths,
          (dexQuoteData as Record<DexId, DexQuoteData>)[dexId].payload as QuotePayload,
          dexId as DexId
        );

        return { ...buffer, [dexId]: swapResult };
      }, {});

      let bestDexId: number = DexId.XOR;

      for (const currentDexId in results) {
        const currAmount = FPNumber.fromCodecValue(results[currentDexId].amount);
        const bestAmount = FPNumber.fromCodecValue(results[bestDexId].amount);

        if (currAmount.isZero()) continue;

        if (
          FPNumber.isLessThan(currAmount, bestAmount)
          // &&
          // this.isExchangeB
          // ||
          // (FPNumber.isLessThan(bestAmount, currAmount) && !this.isExchangeB)
        ) {
          bestDexId = +currentDexId;
        }
      }

      const { amount, amountWithoutImpact, fee, rewards } = results[bestDexId];

      return {
        action: async () =>
          await api.swap.executeSwapAndSend(
            recipient.wallet,
            inputAsset,
            recipient.asset,
            amount,
            tokenEquivalent,
            undefined,
            true,
            undefined,
            bestDexId as DexId
          ),
        swapAndSendData: {
          address: recipient.wallet,
          targetAmount: tokenEquivalent,
          asset: recipient.asset,
          dexId: bestDexId,
        },
        recipient,
        assetAddress: recipient.asset.address,
      };
    } catch (error: any) {
      throw new Error(error);
      return {
        recipient,
      };
    }
  }
}
// __________________________OLD_________________________________________

// async function executeBatchSwapAndSend(context, data: Array<any>): Promise<any> {
//   const { commit } = routeAssetsActionContext(context);

//   async function processArray(transactions) {
//     for (const tx of transactions) {
//       try {
//         await tx
//           .action()
//           .then(() => {
//             commit.setRecipientStatus({
//               id: tx.recipient.id,
//               status: RecipientStatus.SUCCESS,
//             });
//             commit.setRecipientCompleted(tx.recipient.id);
//           })
//           .catch(() => {
//             commit.setRecipientStatus({
//               id: tx.recipient.id,
//               status: RecipientStatus.FAILED,
//             });
//           });
//       } catch (err) {
//         commit.setRecipientStatus({
//           id: tx.recipient.id,
//           status: RecipientStatus.FAILED,
//         });
//       }
//     }
//   }

//   await processArray(data);
// }
// ______________________________________________________________________

async function executeBatchSwapAndSend(context, data: Array<any>): Promise<any> {
  const { commit, getters, rootCommit } = routeAssetsActionContext(context);
  const inputAsset = getters.inputToken;
  const groupedData = Object.values(groupBy(data, 'assetAddress'));
  const processArrayData = groupedData.map((recipients) => {
    const recievers = recipients.map((item) => {
      const decimals = item.swapAndSendData.asset.decimals;
      const targetAmount = new FPNumber(item.swapAndSendData.targetAmount, decimals).toCodecString();
      return {
        accountId: item.swapAndSendData.address,
        targetAmount,
        recipientId: item.recipient.id,
        targetAmountNum: Number(item.swapAndSendData.targetAmount),
        dexId: item.swapAndSendData.dexId,
      };
    });
    const maxInputAmount = getAssetBalance(inputAsset);
    const outputAsset = recipients[0].swapAndSendData.asset;
    if (!api.assets.getAsset(outputAsset.address)) {
      api.assets.addAccountAsset(outputAsset.address);
    }
    const dexId = recievers[0].dexId;
    const options = {
      approxSum: sumBy(recievers, (item: any) => item.targetAmountNum),
      outputAsset,
    };
    return {
      recievers,
      params: calcTxParams(inputAsset, outputAsset, maxInputAmount, undefined, dexId),
      options,
    };
  });

  // const formattedToAddress = receiver.slice(0, 2) === 'cn' ? receiver : this.root.formatAddress(receiver);

  async function processArray(transactions) {
    for (const tx of transactions) {
      await withLoading(async () => {
        try {
          const { params, options } = tx;
          const time = Date.now();
          await api
            .submitExtrinsic(
              (api.api.tx.liquidityProxy as any).swapTransferBatch(tx.recievers, ...params.args),
              api.account.pair,
              {
                symbol: inputAsset.symbol,
                assetAddress: inputAsset.address,
                amount2: `${options.approxSum.toFixed(6)}`,
                symbol2: options.outputAsset.symbol,
                asset2Address: options.outputAsset.address,
                to: api.account.pair.address,
                type: Operation.SwapAndSend,
              }
            )
            .then(async () => {
              const lastTx = await getLastTransaction(time);
              rootCommit.wallet.transactions.addActiveTx(lastTx.id as string);
              tx.recievers.forEach((reciever) => {
                commit.setRecipientTxId({
                  id: reciever.recipientId,
                  txId: lastTx.id,
                });
              });
            })
            .catch((err) => {
              console.dir(err);
              tx.recievers.forEach((reciever) => {
                commit.setRecipientStatus({
                  id: reciever.recipientId,
                  status: RecipientStatus.FAILED,
                });
              });
            });
        } catch (err) {
          console.dir(err);
          tx.recievers.forEach((reciever) => {
            commit.setRecipientStatus({
              id: reciever.recipientId,
              status: RecipientStatus.FAILED,
            });
          });
        }
      });
    }
  }

  await processArray(processArrayData);
}

async function executeTransfer(context, data: Array<any>): Promise<any> {
  const { commit, rootCommit } = routeAssetsActionContext(context);
  if (data.length < 1) return;
  const time = Date.now();
  await api
    .submitExtrinsic(api.api.tx.utility.batchAll(data.map((item) => item.transfer.extrinsic)), api.account.pair, {
      symbol: data[0].recipient.asset.symbol,
      from: api.account.pair.address,
      to: api.account.pair.address,
      assetAddress: data[0].recipient.asset.symbol,
      type: Operation.Transfer,
    })
    .then(async () => {
      const lastTx = await getLastTransaction(time);
      rootCommit.wallet.transactions.addActiveTx(lastTx.id as string);
      data.forEach((reciever) => {
        commit.setRecipientTxId({
          id: reciever.recipient.id,
          txId: lastTx.id,
        });
      });
    })
    .catch((err) => {
      data.forEach((tr) => {
        commit.setRecipientStatus({
          id: tr.recipient.id,
          status: RecipientStatus.FAILED,
        });
      });
      throw new Error(err);
    });
}

async function getLastTransaction(time: number): Promise<any> {
  const tx = findLast(api.historyList as any, (item) => Number(item.startTime) > time);
  if (!tx) {
    await delay();
    return await getLastTransaction(time);
  }
  return tx;
}

let loading = false;

async function withLoading<T = void>(func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T> {
  loading = true;
  try {
    return await func();
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    loading = false;
  }
}

function calcTxParams(
  assetFrom: Asset | AccountAsset,
  assetTo: Asset | AccountAsset,
  maxAmount: NumberLike,
  liquiditySource = LiquiditySourceTypes.Default,
  dexId = DexId.XOR
) {
  assert(api.account, Messages.connectWallet);
  const decimals = assetTo.decimals;
  const amount = FPNumber.fromCodecValue(maxAmount, decimals).toCodecString();
  const liquiditySources = liquiditySource ? [liquiditySource] : [];
  return {
    args: [
      dexId,
      assetFrom.address,
      assetTo.address,
      amount,
      liquiditySources,
      liquiditySource === LiquiditySourceTypes.Default ? 'Disabled' : 'AllowSelected',
    ],
  };
}

export default actions;
