import { BN, hexToU8a, u8aToHex } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';
import type { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import type { KeyringPair } from '@polkadot/keyring/types';

import { HistoryItem, Operation, TransactionStatus } from '../types';
import { api, type Api } from '../api';
import { KeyringAddress } from '@polkadot/ui-keyring/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { Subject, Subscription } from 'rxjs';
import { SwapAmount } from '@sora-substrate/types';
import { XOR } from '../assets/consts';
import type { Bytes } from '@polkadot/types-codec';

const utf8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : undefined;

const decodeUtf8 = (value: Uint8Array): string => {
  if (utf8Decoder) {
    return utf8Decoder.decode(value);
  }

  let result = '';
  for (let i = 0; i < value.length; i += 1) {
    result += String.fromCharCode(value[i]);
  }
  return result;
};

/**
 * This module is used for internal needs
 */
export class MstModule<T> {
  constructor(private readonly root: Api<T>) {}

  private mstAddress?: string;
  private pendingTxsSubject = new Subject<HistoryItem[]>();
  public pendingTxsUpdated = this.pendingTxsSubject.asObservable();
  private lastPendingTxs: HistoryItem[] = [];
  private pendingTxsSubscription: Subscription | null = null;

  /**
   * Returns locally known multisig accounts when the wallet keyring has finished loading.
   */
  private getMultisigAccounts(): KeyringAddress[] {
    const keyring = this.root.keyring as { getAddresses?: () => KeyringAddress[] } | undefined;

    if (typeof keyring?.getAddresses !== 'function') {
      return [];
    }

    return keyring.getAddresses().filter(({ meta }) => meta.isMultisig);
  }

  getMSTName(): string {
    const addressMST = this.root.accountStorage?.get('MSTAddress') || this.root.account?.pair?.address || '';
    const multisigAccount = this.getMstAccount(addressMST);
    return multisigAccount?.meta.name ?? '';
  }

  public createMST(accounts: string[], threshold: number, name: string, deadlineInBlocks?: number): string {
    const keyring = this.root.keyring; // Access keyring via the getter

    const result = keyring.addMultisig(accounts, threshold, { name });
    const addressMST = this.root.formatAddress(result.pair.address);
    keyring.saveAddress(addressMST, {
      name,
      isMultisig: true,
      threshold,
      who: accounts,
      deadlineInBlocks,
    });
    this.root.accountStorage?.set('MSTAddress', addressMST);

    this.mstAddress = addressMST;
    this.root.setMstAccount(result);

    return addressMST;
  }

  /**
   * Get Multisig Account
   */
  public getMstAccount(address: string): KeyringAddress | undefined {
    const multisigAccounts = this.getMultisigAccounts();
    const multisigAccount = multisigAccounts.find((account) => {
      const accountAddress = this.root.formatAddress(account.address, false);
      const targetAddress = this.root.formatAddress(address, false);
      return accountAddress === targetAddress;
    });
    return multisigAccount;
  }

  /**
   * Update Multisig Account Name
   */
  public updateMultisigName(newName: string): void {
    const addressMST =
      this.root.formatAddress(this.root.accountStorage?.get('MSTAddress')) ||
      this.root.formatAddress(this.root.account?.pair?.address);

    const multisigAccount = this.getMstAccount(addressMST);
    if (multisigAccount) {
      this.root.changeAccountName(multisigAccount.address, newName);
    } else {
      console.error(`Multisig account with address ${addressMST} not found among multisig accounts.`);
    }
  }

  public isMstAddressExist(): boolean {
    /* We taking previousAccountAddress because for now we are in MST,
    and we have MST address stored onle in default account
    previousAccountAddress have only MST*/
    const addressMST =
      (this.root.accountStorage?.get('previousAccountAddress') || this.root.accountStorage?.get('MSTAddress')) ?? '';
    return addressMST !== '';
  }

  public getPrevoiusAccount(): string | undefined {
    return this.root.accountStorage?.get('previousAccountAddress') || this.root.previousAccount?.pair.address;
  }

  public getMstAddress(): string {
    return this.root.accountStorage?.get('MSTAddress') || this.root.account?.pair?.address || '';
  }

  public isMST(): boolean {
    const addressMST = this.root.accountStorage?.get('previousAccountAddress');
    return addressMST !== '';
  }

  public forgetMSTAccount(): void {
    const previousAccountAddress = this.root.accountStorage?.get('previousAccountAddress');
    const previousAccountPair = this.root.getAccountPair(previousAccountAddress ?? '');
    const meta = previousAccountPair.meta;
    const mstAddress = this.root.address;

    this.root.accountStorage?.remove('previousAccountAddress');
    this.root.accountStorage?.remove('assetsAddresses');
    // Login to the default account
    this.root.loginAccount(
      previousAccountPair.address,
      meta.name as string,
      meta.source as string,
      meta.isExternal as boolean
    );
    this.root.accountStorage?.remove('MSTAddress');
    this.root.forgetAccount(mstAddress);
  }

  public switchAccount(switchToMST: boolean): void {
    const currentAccountAddress = this.root.account?.pair?.address || '';
    let targetAddress: string | undefined;
    let storePreviousAccountAddress = false;
    if (switchToMST) {
      targetAddress = this.root.accountStorage?.get('MSTAddress') || this.mstAddress;
      storePreviousAccountAddress = true;
    } else {
      targetAddress =
        this.root.accountStorage?.get('previousAccountAddress') || this.root.previousAccount?.pair.address;
    }

    const accountPair = this.root.getAccountPair(this.root.formatAddress(targetAddress) || '');
    const meta = accountPair.meta;

    if (switchToMST) {
      this.root.switchToMstAccount();
    } else {
      this.root.switchToMainAccount();
    }
    this.root.loginAccount(accountPair.address, meta.name as string, meta.source as string, meta.isExternal as boolean);
    if (storePreviousAccountAddress) {
      this.root.accountStorage?.set('previousAccountAddress', currentAccountAddress);
    }
  }

  // Submitting for the first time
  public async submitMultisigExtrinsic(
    call: SubmittableExtrinsic,
    multisigAccountPair: KeyringPair,
    signerAccountPair: KeyringPair,
    historyData: HistoryItem,
    unsigned = false
  ): Promise<T> {
    console.info('we are in submitMultisigExtrinsic');
    const callHash = call.method.hash;
    const multisigAccount = this.getMstAccount(multisigAccountPair.address);
    if (!multisigAccount) {
      throw new Error(`Multisig account with address ${multisigAccountPair.address} not found.`);
    }

    const meta = multisigAccount.meta as unknown as any;
    if (!meta) {
      throw new Error(`Metadata for multisig account ${multisigAccountPair.address} is missing.`);
    }

    const allSignatories = meta.who ? [...meta.who].map((address) => this.root.formatAddress(address)) : [];
    const formattedSignerAddress = this.root.formatAddress(signerAccountPair.address);

    const otherSignatories = allSignatories.filter((address) => address !== formattedSignerAddress);
    otherSignatories.sort();
    const threshold = meta.threshold;

    const multisigAddress = multisigAccountPair.address;
    const info = await this.root.api.query.multisig.multisigs(multisigAddress, callHash);
    let maybeTimepoint = null;
    if (info.isSome) {
      const { when } = info.unwrap();
      maybeTimepoint = when;
    }

    const MAX_WEIGHT = new BN('640000000');
    const maxWeight = this.root.api.registry.createType('Weight', {
      refTime: MAX_WEIGHT,
      proofSize: new BN(0),
    });

    const callDataHex = call.method.toHex();
    const dataStringify = JSON.stringify(callDataHex);
    const cosignersForEncrypt: Record<string, string> = {};
    for (const address of allSignatories) {
      const pubKey = this.root.getPublicKeyByAddress(address);
      cosignersForEncrypt[address] = `0x${pubKey}`;
    }

    const encryptParams = {
      address: this.root.formatAddress(signerAccountPair.address),
      data: dataStringify,
      cosigners: cosignersForEncrypt,
    };
    const finalEncryptedObj = await (window as any).injectedWeb3['fearless-wallet'].encryptByCosigner(encryptParams);
    const finalEncryptedStr = JSON.stringify(finalEncryptedObj);
    const systemRemarkCall = this.root.api.tx.system.remark(finalEncryptedStr);

    const multisigCall = this.root.api.tx.multisig.asMulti(
      threshold,
      otherSignatories,
      maybeTimepoint,
      call,
      maxWeight
    );

    // Create batch call
    const batchCall = this.root.api.tx.utility.batch([systemRemarkCall, multisigCall]);

    const updatedHistoryData = {
      ...historyData,
      from: multisigAccountPair.address,
      ...(threshold === 1 && { status: TransactionStatus.Finalized }),
    };

    return await this.root.submitExtrinsic(batchCall, signerAccountPair, updatedHistoryData, unsigned);
  }

  // Approving from another co-signers
  public async approveMultisigExtrinsic(callHash: string, multisigAccountAddress: string): Promise<void> {
    const signerAddress =
      this.root.formatAddress(this.root.accountStorage?.get('previousAccountAddress')) ||
      this.root.formatAddress(this.root.previousAccount?.pair.address) ||
      '';
    const signerAccountPair = this.root.getAccountPair(signerAddress);

    const multisigAccount = this.getMstAccount(multisigAccountAddress);

    if (!multisigAccount) {
      throw new Error(`Multisig account with address ${multisigAccountAddress} not found.`);
    }

    const meta = multisigAccount.meta as any;
    if (!meta) {
      throw new Error(`Metadata for multisig account ${multisigAccountAddress} is missing.`);
    }
    const allSignatories = meta.who ? [...meta.who].map((address) => this.root.formatAddress(address)) : [];
    const formattedSignerAddress = this.root.formatAddress(signerAccountPair.address);

    const otherSignatories = allSignatories.filter((address) => address !== formattedSignerAddress);
    otherSignatories.sort();
    const threshold = meta.threshold;

    const info = await this.root.api.query.multisig.multisigs(multisigAccountAddress, callHash);
    if (info.isNone) {
      throw new Error('No pending multisig transaction found for the given callHash');
    }

    const { when, approvals } = info.unwrap();
    const maybeTimepoint = when;

    const numApprovals = approvals.length;
    const willReachThreshold = numApprovals + 1 >= threshold;

    if (willReachThreshold) {
      const blockNumber = when.height.toNumber();
      const extrinsicIndex = when.index.toNumber();
      const blockHash = await this.root.api.rpc.chain.getBlockHash(blockNumber);
      const signedBlock = await this.root.api.rpc.chain.getBlock(blockHash);
      const extrinsics = signedBlock.block.extrinsics;
      const extrinsic = extrinsics[extrinsicIndex];

      if (extrinsic.method.section === 'utility' && extrinsic.method.method === 'batch') {
        const { finalProofSize, details } = await this.calculateFinalProofSize(callHash, signerAddress);
        const calls = extrinsic.method.args[0] as any;

        let systemRemarkCall: any = null;

        for (const call of calls) {
          if (call.section === 'system' && call.method === 'remark') {
            systemRemarkCall = call;
            break;
          }
        }

        if (!systemRemarkCall) {
          throw new Error('No system.remark call found in the batch');
        }

        const finalEncryptedStr = systemRemarkCall.args[0].toUtf8();
        let finalEncryptedObj = JSON.parse(finalEncryptedStr);
        const myAddress = api.formatAddress(this.getPrevoiusAccount() || this.root.account?.pair.address);
        const pubKeyHex = this.root.getPublicKeyByAddress(extrinsic.signer.toString());
        const pubKey = hexToU8a(pubKeyHex);

        const decryptedParams = {
          address: myAddress,
          data: finalEncryptedObj,
          encryptorPublicKey: u8aToHex(pubKey),
        };
        const callDataHex = await (window as any).injectedWeb3['fearless-wallet'].decryptForCosigner(decryptedParams);

        const callData = this.root.api.registry.createType('Call', callDataHex);
        const MAX_WEIGHT = this.root.api.registry.createType('WeightV2', {
          refTime: details.finalRefTime,
          proofSize: finalProofSize,
        });

        const asMultiExtrinsic = this.root.api.tx.multisig.asMulti(
          threshold,
          otherSignatories,
          maybeTimepoint,
          callData,
          MAX_WEIGHT
        );
        await this.root.submitExtrinsic(asMultiExtrinsic, signerAccountPair);
        const existingHistoryItem = this.root.getHistory(callHash);
        if (existingHistoryItem) {
          existingHistoryItem.status = TransactionStatus.Finalized;
          if ('multisig' in existingHistoryItem && existingHistoryItem.multisig) {
            existingHistoryItem.multisig.numApprovals = existingHistoryItem.multisig.numApprovals + 1;
          }
          this.root.saveHistory(existingHistoryItem);
        } else {
          console.warn(`No history item found for callHash: ${callHash}`);
        }
      } else {
        throw new Error('Extrinsic at specified index is not utility.batch');
      }
    } else {
      const MAX_WEIGHT = this.root.api.registry.createType('Weight', { refTime: new BN('640000000'), proofSize: 0 });

      const approveExtrinsic = this.root.api.tx.multisig.approveAsMulti(
        threshold,
        otherSignatories,
        maybeTimepoint,
        callHash,
        MAX_WEIGHT
      );

      await this.root.submitExtrinsic(approveExtrinsic, signerAccountPair);
    }
  }

  public async calculateFinalProofSize(
    callHash: string,
    signerAddress: string
  ): Promise<{ finalProofSize: BN; details: any }> {
    try {
      const multisigInfo = await this.getMultisigInfoByCallHash(callHash);
      if (!multisigInfo) {
        throw new Error(`No multisig transaction found for callHash: ${callHash}`);
      }

      const { when } = multisigInfo;
      const blockNumber = when.height.toNumber();
      const extrinsicIndex = when.index.toNumber();
      const blockHash = await this.root.api.rpc.chain.getBlockHash(blockNumber);
      const signedBlock = await this.root.api.rpc.chain.getBlock(blockHash);
      const extrinsics = signedBlock.block.extrinsics;

      const extrinsic = extrinsics[extrinsicIndex];

      if (!(extrinsic.method.section === 'utility' && extrinsic.method.method === 'batch')) {
        throw new Error('Extrinsic at specified index is not utility.batch');
      }

      const calls = extrinsic.method.args[0] as unknown as any[];
      let systemRemarkCall: any = null;
      let multisigCall: any = null;

      for (const call of calls) {
        if (call.section === 'system' && call.method === 'remark') {
          systemRemarkCall = call;
        } else if (call.section === 'multisig' && call.method === 'asMulti') {
          multisigCall = call;
        }
      }

      if (!systemRemarkCall) {
        throw new Error('No system.remark call found in the batch');
      }

      if (!multisigCall) {
        throw new Error('No multisig.asMulti call found in the batch');
      }

      const finalEncryptedStr = systemRemarkCall.args[0].toUtf8();
      let finalEncryptedObj = JSON.parse(finalEncryptedStr);
      const myAddress = api.formatAddress(this.getPrevoiusAccount() || this.root.account?.pair.address);
      const pubKeyHex = this.root.getPublicKeyByAddress(extrinsic.signer.toString());
      const pubKey = hexToU8a(pubKeyHex);

      const decryptedParams = {
        address: myAddress,
        data: finalEncryptedObj,
        encryptorPublicKey: u8aToHex(pubKey),
      };
      const callDataHex = await (window as any).injectedWeb3['fearless-wallet'].decryptForCosigner(decryptedParams);

      const callData = this.root.api.registry.createType('Call', callDataHex);
      const callArgs = Array.from(callData.args);
      const dummyExtrinsic = this.root.api.tx[callData.section][callData.method].apply(null, callArgs);
      const paymentInfo = await dummyExtrinsic.paymentInfo(signerAddress);
      const callWeight = paymentInfo.weight;
      const callLength = callData.encodedLength;
      const callRefTime = callWeight.refTime.toBn();
      const callProofSize = callWeight.proofSize.toBn();
      const totalProofSize = callProofSize.addn(callLength);
      const adjustedRefTime = callRefTime.muln(110).divn(100);
      const adjustedProofSize = totalProofSize;
      const maxBlockWeights = this.root.api.consts.system.blockWeights;
      const maxBlockRefTime = maxBlockWeights.maxBlock.refTime.toBn();
      const maxBlockProofSize = maxBlockWeights.maxBlock.proofSize.toBn();
      const finalRefTime = BN.min(adjustedRefTime, maxBlockRefTime);
      const finalProofSize = BN.min(adjustedProofSize, maxBlockProofSize);
      console.info('Final RefTime (after min with maxBlock):', finalRefTime.toString());
      console.info('Final ProofSize (after min with maxBlock):', finalProofSize.toString());

      return {
        finalProofSize,
        details: {
          callRefTime: callRefTime.toString(),
          callProofSize: callProofSize.toString(),
          totalProofSize: totalProofSize.toString(),
          adjustedRefTime: adjustedRefTime.toString(),
          adjustedProofSize: adjustedProofSize.toString(),
          maxBlockRefTime: maxBlockRefTime.toString(),
          maxBlockProofSize: maxBlockProofSize.toString(),
          finalRefTime: finalRefTime.toString(),
          finalProofSize: finalProofSize.toString(),
        },
      };
    } catch (error) {
      console.error(`Error calculating finalProofSize for callHash ${callHash}:`, error);
      throw error;
    }
  }

  private async getMultisigInfoByCallHash(callHash: string): Promise<any | null> {
    try {
      const multisigAccounts = this.getMultisigAccounts();

      for (const account of multisigAccounts) {
        const multisigAddress = account.address;
        const info = await this.root.api.query.multisig.multisigs(multisigAddress, callHash);
        if (info.isSome) {
          return info.unwrap();
        }
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving multisig info for callHash ${callHash}:`, error);
      return null;
    }
  }

  public async startPendingTxsSubscription(mstAccount: string): Promise<void> {
    try {
      const unsubscribe = await this.root.api.rpc.chain.subscribeNewHeads(async () => {
        try {
          const pendingTxs = await this.subscribeOnPendingTxs(mstAccount);

          this.lastPendingTxs = pendingTxs || [];

          this.pendingTxsSubject.next(this.lastPendingTxs);
        } catch (error) {
          console.error('Error checking pending MST transactions:', error);
        }
      });

      this.pendingTxsSubscription = new Subscription(unsubscribe);
    } catch (error) {
      console.error('Error subscribing to new blocks:', error);
    }
  }
  public stopPendingTxsSubscription(): void {
    if (this.pendingTxsSubscription) {
      this.pendingTxsSubscription.unsubscribe();
      this.pendingTxsSubscription = null;
    }
  }

  public async subscribeOnPendingTxs(mstAccount: string): Promise<HistoryItem[] | null> {
    // callData преобразование в historyItem
    // 2. [AccountId32, U8aFixed] - 2nd (U8aFixed) is callHash
    // 3. 'someData' below contains block number where this TX was created
    // 4. request extrinsics from this block (system.getExtrinsicsFromBlock)
    // 5. find needed extrinsic (with tx.system.remark event + multisig.approveAsMulti event)
    // 6. get the data from system.remark, decrypt it. it'll be represented as callData
    // 6.1 ensure that hash(callData) is the same as callHash
    // Other methods
    // 7. show it to the user (getHistoryByCallData)
    // 8. user approves or declines:
    // 8.1. if the TX was not the last from threshold - approveAsMulti(callHash)
    // 8.2. if the TX was the last from threshold - asMulti(callData)

    // !!!! Users should have an ability to see callData in UI in case they don't use Fearless Wallet
    // !!!! We should block the flow where user doesn't use Fearless Wallet | Desktop
    try {
      const pendingData = await this.getPendingMultisigTransactions(mstAccount);
      console.info('here is pendingData', pendingData);
      const pendingTransactions: HistoryItem[] = [];

      for (const [key, multisigInfo] of pendingData) {
        const historyItem = await this.processPendingTransaction(mstAccount, key, multisigInfo);
        if (historyItem) {
          pendingTransactions.push(historyItem);
          this.root.saveHistory(historyItem);
        }
      }

      const pendingTransactionIds = pendingTransactions.map((tx) => tx.id);
      for (const [id, transaction] of Object.entries(this.root.history)) {
        if ('multisig' in transaction && transaction.status === TransactionStatus.Pending) {
          if (!pendingTransactionIds.includes(id)) {
            transaction.status = TransactionStatus.Finalized;
            this.root.saveHistory(transaction);
          }
        }
      }

      return pendingTransactions.length > 0 ? pendingTransactions : null;
    } catch (error) {
      console.error('Error in subscribeOnPendingTxs:', error);
      return null;
    }
  }
  private async getPendingMultisigTransactions(mstAccount: string) {
    return await this.root.api.query.multisig.multisigs.entries(mstAccount);
  }
  private async parseCallDataToHistoryItem(
    callData: any,
    multisigInfo: {
      threshold: number;
      signatories: string[];
      numApprovals: number;
      walletsApproved: string[];
    },
    deadlineTrx: {
      expirationBlock: number;
      blocksRemaining: number;
      secondsRemaining: number;
    },
    blockNumber: number,
    blockHash: string,
    blockTimestamp: number,
    mstAccount: string
  ): Promise<HistoryItem> {
    console.info('we are in parseCallDataToHistoryItem');
    const decodedCall = this.root.api.registry.createType('Call', callData);
    console.info('here is decondedCall', decodedCall);
    const method = decodedCall.method;
    console.info('here is method', method);
    const section = decodedCall.section;
    console.info('here is section', section);
    const args = decodedCall.args;
    console.info('here is args', args);

    let historyItem: HistoryItem = {
      id: '',
      from: this.root.formatAddress(mstAccount),
      type: Operation.Transfer,
      multisig: {
        threshold: multisigInfo.threshold,
        signatories: multisigInfo.signatories,
        numApprovals: multisigInfo.numApprovals,
        walletsApproved: multisigInfo.walletsApproved,
      },
      deadline: {
        expirationBlock: deadlineTrx.expirationBlock,
        blocksRemaining: deadlineTrx.blocksRemaining,
        secondsRemaining: deadlineTrx.secondsRemaining,
      },
      blockId: blockHash,
      blockHeight: blockNumber,
      startTime: blockTimestamp,
    };

    const operationKey = `${section}.${method}`;
    const operationMap: { [key: string]: Operation } = {
      'assets.transfer': Operation.Transfer,
      'assets.register': Operation.RegisterAsset,
      'liquidityProxy.swap': Operation.Swap,
      'poolXYK.depositLiquidity': Operation.AddLiquidity,
      'poolXYK.withdrawLiquidity': Operation.RemoveLiquidity,
      'demeterFarmingPlatform.deposit': Operation.DemeterFarmingDepositLiquidity,
      'demeterFarmingPlatform.withdraw': Operation.DemeterFarmingWithdrawLiquidity,
      'demeterFarmingPlatform.getRewards': Operation.DemeterFarmingGetRewards,
      'staking.bondExtra': Operation.StakingBondExtra,
      'staking.unbond': Operation.StakingUnbond,
      'staking.nominate': Operation.StakingNominate,
      'staking.withdrawUnbonded': Operation.StakingWithdrawUnbonded,
      'orderBook.placeLimitOrder': Operation.OrderBookPlaceLimitOrder,
      'orderBook.cancelLimitOrder': Operation.OrderBookCancelLimitOrder,
      'orderBook.cancelLimitOrders': Operation.OrderBookCancelLimitOrders,
      'kensetsu.createCdp': Operation.CreateVault,
      'kensetsu.depositCollateral': Operation.DepositCollateral,
      'kensetsu.borrow': Operation.BorrowVaultDebt,
      'kensetsu.repayDebt': Operation.RepayVaultDebt,
      'kensetsu.closeCdp': Operation.CloseVault,
      'referrals.reserve': Operation.ReferralReserveXor,
      'referrals.unreserve': Operation.ReferralUnreserveXor,
      'referrals.setReferrer': Operation.ReferralSetInvitedUser,
    };

    historyItem.type = operationMap[operationKey];

    switch (historyItem.type) {
      case Operation.Transfer:
        const assetId = args[0];
        let assetAddress: string = '';

        const assetIdHuman = assetId.toHuman();

        if (typeof assetIdHuman === 'object' && assetIdHuman !== null && 'code' in assetIdHuman) {
          const code = (assetIdHuman as Record<string, unknown>)['code'];
          assetAddress = code != null ? code.toString() : '';
        } else if (typeof assetIdHuman === 'string') {
          assetAddress = assetIdHuman;
        } else {
          assetAddress = assetId.toString();
        }

        historyItem.assetAddress = assetAddress;

        const recipientAddress = this.root.formatAddress(args[1].toString());
        historyItem.to = recipientAddress;

        const amountRaw = args[2].toString();
        const assetInfo = await this.root.assets.getAssetInfo(assetAddress);
        const decimals = assetInfo?.decimals ?? this.root.chainDecimals;
        historyItem.amount = new FPNumber(amountRaw, this.root.chainDecimals)
          .div(new FPNumber(10 ** decimals, this.root.chainDecimals))
          .toString();

        historyItem.symbol = assetInfo?.symbol;
        historyItem.decimals = decimals;

        break;
      case Operation.Swap: {
        const inputAssetIdObj = args[1].toHuman() as Record<string, unknown>;
        const outputAssetIdObj = args[2].toHuman() as Record<string, unknown>;
        const inputAssetId = (inputAssetIdObj['code'] as string) || args[1].toString();
        const outputAssetId = (outputAssetIdObj['code'] as string) || args[2].toString();
        const swapAmount = args[3] as SwapAmount;

        historyItem.assetAddress = inputAssetId;
        historyItem.asset2Address = outputAssetId;

        const inputAssetInfo = await this.root.assets.getAssetInfo(inputAssetId);
        const outputAssetInfo = await this.root.assets.getAssetInfo(outputAssetId);

        if (!inputAssetInfo || !outputAssetInfo) {
          throw new Error('Failed to fetch asset info');
        }

        const inputDecimals = inputAssetInfo.decimals ?? this.root.chainDecimals;
        const outputDecimals = outputAssetInfo.decimals ?? this.root.chainDecimals;

        let rawInputAmount: string;
        let rawOutputAmount: string;
        if (swapAmount.isWithDesiredInput) {
          console.info('Swap amount type: WithDesiredInput');
          rawInputAmount = swapAmount.asWithDesiredInput.desiredAmountIn.toString();
          rawOutputAmount = swapAmount.asWithDesiredInput.minAmountOut.toString();
        } else if (swapAmount.isWithDesiredOutput) {
          console.info('Swap amount type: WithDesiredOutput');
          rawInputAmount = swapAmount.asWithDesiredOutput.maxAmountIn.toString();
          rawOutputAmount = swapAmount.asWithDesiredOutput.desiredAmountOut.toString();
        } else {
          throw new Error('Unknown swap amount type');
        }
        const amount = new FPNumber(rawInputAmount, this.root.chainDecimals)
          .div(new FPNumber(10 ** inputDecimals, this.root.chainDecimals))
          .toString();

        const amount2 = new FPNumber(rawOutputAmount, this.root.chainDecimals)
          .div(new FPNumber(10 ** outputDecimals, this.root.chainDecimals))
          .toString();

        historyItem.amount = amount;
        historyItem.amount2 = amount2;
        historyItem.symbol = inputAssetInfo.symbol;
        historyItem.symbol2 = outputAssetInfo.symbol;
        historyItem.decimals = inputDecimals;
        historyItem.decimals2 = outputDecimals;
        break;
      }
      case Operation.AddLiquidity:
      case Operation.RemoveLiquidity: {
        console.info('we are in AddLiquidity or RemoveLiquidity');
        const assetAIdObj = args[1].toHuman() as Record<string, unknown>;
        const assetBIdObj = args[2].toHuman() as Record<string, unknown>;
        const assetAId = (assetAIdObj['code'] as string) || args[1].toString();
        const assetBId = (assetBIdObj['code'] as string) || args[2].toString();
        const assetAInfo = await this.root.assets.getAssetInfo(assetAId);
        const assetBInfo = await this.root.assets.getAssetInfo(assetBId);
        if (!assetAInfo || !assetBInfo) {
          throw new Error('Failed to fetch asset info');
        }
        const assetADecimals = assetAInfo.decimals ?? this.root.chainDecimals;
        const assetBDecimals = assetBInfo.decimals ?? this.root.chainDecimals;
        let rawAmountA;
        let rawAmountB;

        if (historyItem.type === Operation.RemoveLiquidity) {
          rawAmountA = args[4].toString();
          rawAmountB = args[5].toString();
        } else {
          rawAmountA = args[3].toString();
          rawAmountB = args[4].toString();
        }
        const amountA = new FPNumber(rawAmountA, this.root.chainDecimals)
          .div(new FPNumber(10 ** assetADecimals, this.root.chainDecimals))
          .toString();

        const amountB = new FPNumber(rawAmountB, this.root.chainDecimals)
          .div(new FPNumber(10 ** assetBDecimals, this.root.chainDecimals))
          .toString();
        historyItem.assetAddress = assetAId;
        historyItem.asset2Address = assetBId;
        historyItem.amount = amountA;
        historyItem.amount2 = amountB;
        historyItem.symbol = assetAInfo.symbol;
        historyItem.symbol2 = assetBInfo.symbol;
        historyItem.decimals = assetADecimals;
        historyItem.decimals2 = assetBDecimals;
        break;
      }

      case Operation.DemeterFarmingDepositLiquidity:
      case Operation.DemeterFarmingWithdrawLiquidity: {
        console.info('we are in DemeterFarmingDepositLiquidity or DemeterFarmingWithdrawLiquidity');
        const isDeposit = historyItem.type === Operation.DemeterFarmingDepositLiquidity;
        const rewardPoolIdObj = args[0].toHuman() as Record<string, unknown>;
        const assetIdObj = args[1].toHuman() as Record<string, unknown>;
        const rawAmountCodec = isDeposit ? args[4] : args[3];
        const rawAmount = rawAmountCodec.toString();
        const rewardPoolId = (rewardPoolIdObj['code'] as string) || args[0].toString();
        const assetId = (assetIdObj['code'] as string) || args[1].toString();
        const rewardPoolAssetInfo = await this.root.assets.getAssetInfo(rewardPoolId);
        const assetInfo = await this.root.assets.getAssetInfo(assetId);
        if (historyItem.type === Operation.DemeterFarmingWithdrawLiquidity && rewardPoolId === assetId) {
          historyItem.type = Operation.DemeterFarmingUnstakeToken;
        }
        if (historyItem.type === Operation.DemeterFarmingDepositLiquidity && rewardPoolId === assetId) {
          historyItem.type = Operation.DemeterFarmingStakeToken;
        }
        if (!rewardPoolAssetInfo || !assetInfo) {
          throw new Error('Failed to fetch asset info for farming or reward assets');
        }

        const decimals = rewardPoolAssetInfo.decimals ?? this.root.chainDecimals;
        const amount = new FPNumber(rawAmount, this.root.chainDecimals)
          .div(new FPNumber(10 ** decimals, this.root.chainDecimals))
          .toString();

        historyItem.assetAddress = rewardPoolId;
        historyItem.asset2Address = assetId;
        historyItem.amount = amount;
        historyItem.symbol = rewardPoolAssetInfo.symbol;
        historyItem.symbol2 = assetInfo.symbol;
        historyItem.decimals = rewardPoolAssetInfo.decimals;
        historyItem.decimals2 = assetInfo.decimals;
        break;
      }

      case Operation.StakingBondExtra:
      case Operation.StakingUnbond:
      case Operation.StakingWithdrawUnbonded:
      case Operation.ReferralReserveXor:
      case Operation.ReferralUnreserveXor: {
        const rawAmount = args[0].toString();
        const stakingTokenAddress = XOR.address;
        const stakingTokenInfo = await this.root.assets.getAssetInfo(stakingTokenAddress);
        if (!stakingTokenInfo) {
          throw new Error('Failed to fetch staking token info');
        }
        const decimalsBond = stakingTokenInfo.decimals ?? this.root.chainDecimals;
        const normalizedAmount = new FPNumber(rawAmount, this.root.chainDecimals)
          .div(new FPNumber(10 ** decimalsBond, this.root.chainDecimals))
          .toString();
        historyItem.amount = normalizedAmount;
        historyItem.symbol = stakingTokenInfo.symbol;
        historyItem.decimals = decimalsBond;
        historyItem.assetAddress = stakingTokenAddress;
        break;
      }
      case Operation.DemeterFarmingGetRewards: {
        const rewardAssetIdObj = args[2].toHuman() as Record<string, unknown>;
        const rewardAssetId = (rewardAssetIdObj['code'] as string) || args[2].toString();
        const rewardAssetInfo = await this.root.assets.getAssetInfo(rewardAssetId);
        if (!rewardAssetInfo) {
          throw new Error('Failed to fetch asset info for reward or farming assets');
        }
        historyItem.assetAddress = rewardAssetId;
        historyItem.symbol = rewardAssetInfo.symbol;
        historyItem.decimals = rewardAssetInfo.decimals;
        break;
      }
      case Operation.OrderBookPlaceLimitOrder: {
        try {
          const marketId = args[0];
          const priceRaw = args[1].toString();
          const amountRaw = args[2].toString();
          const marketIdHuman = marketId.toHuman() as Record<string, Record<string, unknown>>;
          const baseAssetId = marketIdHuman['base']?.['code'] as string | undefined;
          const quoteAssetId = marketIdHuman['quote']?.['code'] as string | undefined;

          if (!baseAssetId || !quoteAssetId) {
            throw new Error('Failed to decode marketId for base or quote assets');
          }

          const baseAssetInfo = await this.root.assets.getAssetInfo(baseAssetId);
          const quoteAssetInfo = await this.root.assets.getAssetInfo(quoteAssetId);
          if (!baseAssetInfo || !quoteAssetInfo) {
            throw new Error('Failed to fetch asset info for base or quote assets');
          }

          const baseDecimals = baseAssetInfo.decimals ?? this.root.chainDecimals;
          const quoteDecimals = quoteAssetInfo.decimals ?? this.root.chainDecimals;

          const baseAmount = new FPNumber(amountRaw, this.root.chainDecimals)
            .div(new FPNumber(10 ** baseDecimals, this.root.chainDecimals))
            .toString();

          const quoteAmount = new FPNumber(priceRaw, this.root.chainDecimals)
            .div(new FPNumber(10 ** quoteDecimals, this.root.chainDecimals))
            .toString();

          historyItem.assetAddress = baseAssetId;
          historyItem.asset2Address = quoteAssetId;
          historyItem.amount = baseAmount;
          historyItem.amount2 = quoteAmount;
          historyItem.symbol = baseAssetInfo.symbol;
          historyItem.symbol2 = quoteAssetInfo.symbol;
          historyItem.decimals = baseDecimals;
          historyItem.decimals2 = quoteDecimals;
        } catch (error) {
          console.error('Error processing orderBook.placeLimitOrder operation:', error);
        }
        break;
      }
      case Operation.RegisterAsset: {
        const rawBytes = args[0] as Bytes;
        const symbol = decodeUtf8(rawBytes.toU8a(true));
        historyItem.symbol = symbol;
        break;
      }
      case Operation.CreateVault: {
        const collateralAssetIdObj = args[0].toHuman() as Record<string, unknown>;
        const syntheticAssetIdObj = args[2].toHuman() as Record<string, unknown>;
        const collateralAssetId = (collateralAssetIdObj['code'] as string) || args[0].toString();
        const syntheticAssetId = (syntheticAssetIdObj['code'] as string) || args[2].toString();

        const collateralAmountRaw = args[1].toString();
        const syntheticAmountRaw = args[3].toString();

        const collateralAssetInfo = await this.root.assets.getAssetInfo(collateralAssetId);
        const syntheticAssetInfo = await this.root.assets.getAssetInfo(syntheticAssetId);

        if (!collateralAssetInfo || !syntheticAssetInfo) {
          throw new Error('Failed to fetch asset info for collateral or synthetic assets');
        }

        const collateralDecimals = collateralAssetInfo.decimals ?? this.root.chainDecimals;
        const syntheticDecimals = syntheticAssetInfo.decimals ?? this.root.chainDecimals;

        const collateralAmount = new FPNumber(collateralAmountRaw, this.root.chainDecimals)
          .div(new FPNumber(10 ** collateralDecimals, this.root.chainDecimals))
          .toString();

        const syntheticAmount = new FPNumber(syntheticAmountRaw, this.root.chainDecimals)
          .div(new FPNumber(10 ** syntheticDecimals, this.root.chainDecimals))
          .toString();

        historyItem.assetAddress = collateralAssetId;
        historyItem.asset2Address = syntheticAssetId;
        historyItem.amount = collateralAmount;
        historyItem.amount2 = syntheticAmount;
        historyItem.symbol = collateralAssetInfo.symbol;
        historyItem.symbol2 = syntheticAssetInfo.symbol;
        historyItem.decimals = collateralDecimals;
        historyItem.decimals2 = syntheticDecimals;
        break;
      }
      case Operation.DepositCollateral:
      case Operation.BorrowVaultDebt:
      case Operation.RepayVaultDebt: {
        const vaultId = args[0];
        const amountRaw = args[1].toString();
        const vaultIdNumber = parseInt(vaultId.toString(), 10);
        const vault = await api.kensetsu.getVault(vaultIdNumber);
        if (!vault) {
          throw new Error(`Vault not found for ID: ${vaultIdNumber}`);
        }
        const assetId = historyItem.type === Operation.DepositCollateral ? vault.lockedAssetId : vault.debtAssetId;
        const assetInfo = await this.root.assets.getAssetInfo(assetId);
        if (!assetInfo) {
          throw new Error(`Asset info not found for ID: ${assetId}`);
        }
        const decimals = assetInfo.decimals ?? this.root.chainDecimals;
        const normalizedAmount = new FPNumber(amountRaw, this.root.chainDecimals)
          .div(new FPNumber(10 ** decimals, this.root.chainDecimals))
          .toString();
        historyItem.assetAddress = assetId;
        historyItem.amount = normalizedAmount;
        historyItem.symbol = assetInfo.symbol;
        historyItem.decimals = decimals;
        break;
      }
      case Operation.CloseVault: {
        const vaultId = args[0];
        const vaultIdNumber = parseInt(vaultId.toString(), 10);
        const vault = await api.kensetsu.getVault(vaultIdNumber);
        if (!vault) {
          throw new Error(`Vault not found for ID: ${vaultIdNumber}`);
        }
        const lockedAmount = vault.lockedAmount.toString();
        const debtAmount = vault.internalDebt.toString();
        const lockedAssetId = vault.lockedAssetId;
        const debtAssetId = vault.debtAssetId;
        const lockedAssetInfo = await this.root.assets.getAssetInfo(lockedAssetId);
        const debtAssetInfo = await this.root.assets.getAssetInfo(debtAssetId);
        const decimalsLockedAsset = lockedAssetInfo.decimals ?? this.root.chainDecimals;
        const decimalsDebstAsset = debtAssetInfo.decimals ?? this.root.chainDecimals;
        const normalizedAmountLockedAsset = new FPNumber(lockedAmount, this.root.chainDecimals).toString();
        const normalizedAmountDebtAsset = new FPNumber(debtAmount, this.root.chainDecimals).toString();
        historyItem.assetAddress = lockedAssetId;
        historyItem.asset2Address = debtAssetId;
        historyItem.amount = normalizedAmountLockedAsset;
        historyItem.amount2 = normalizedAmountDebtAsset;
        historyItem.symbol = lockedAssetInfo.symbol;
        historyItem.symbol2 = debtAssetInfo.symbol;
        historyItem.decimals = decimalsLockedAsset;
        historyItem.decimals2 = decimalsDebstAsset;
        break;
      }

      case Operation.ReferralSetInvitedUser: {
        const invitedUserAddress = args[0].toString();
        historyItem.to = invitedUserAddress;
        break;
      }

      default:
        console.warn(`Unhandled operation for ${operationKey}`);
    }

    return historyItem;
  }

  private async processPendingTransaction(
    mstAccount: string,
    key: any,
    multisigInfo: any
  ): Promise<HistoryItem | null> {
    const callHash = key.args[1].toHex();
    const info = multisigInfo.unwrap();
    const { when, approvals } = info;
    const blockNumber = when.height.toNumber();
    const extrinsicIndex = when.index.toNumber();
    const blockHash = await this.root.api.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await this.root.api.rpc.chain.getBlock(blockHash);
    const extrinsics = signedBlock.block.extrinsics;

    const extrinsic = extrinsics[extrinsicIndex];

    const fullExtrinsicHash = blake2AsHex(extrinsic.toU8a());
    const historyEntries = Object.entries(this.root.history);

    for (const [id] of historyEntries) {
      if (id === fullExtrinsicHash) {
        this.root.removeHistory(id);
        break;
      }
    }

    if (extrinsic.method.section === 'utility' && extrinsic.method.method === 'batch') {
      const calls = extrinsic.method.args[0] as any;
      let systemRemarkCall: any = null;
      let asMultiCall: any = null;

      for (const call of calls) {
        if (call.section === 'system' && call.method === 'remark') {
          systemRemarkCall = call;
        } else if (call.section === 'multisig' && call.method === 'asMulti') {
          asMultiCall = call;
        }
      }
      if (!asMultiCall) {
        console.warn('No multisig.asMulti call found in the batch');
        return null;
      }

      if (!systemRemarkCall) {
        console.warn('No system.remark call found in the batch');
        return null;
      }

      const finalEncryptedStr = systemRemarkCall.args[0].toUtf8();
      let finalEncryptedObj = JSON.parse(finalEncryptedStr);
      const myAddress = api.formatAddress(this.getPrevoiusAccount() || this.root.account?.pair.address);
      const pubKeyHex = this.root.getPublicKeyByAddress(extrinsic.signer.toString());
      const pubKey = hexToU8a(pubKeyHex);

      const decryptedParams = {
        address: myAddress,
        data: finalEncryptedObj,
        encryptorPublicKey: u8aToHex(pubKey),
      };
      const callDataHex = await (window as any).injectedWeb3['fearless-wallet'].decryptForCosigner(decryptedParams);
      const threshold = Number(asMultiCall.args[0].toString());
      const otherSignatories = asMultiCall.args[1].toHuman() as string[];
      const signerAddress = extrinsic.signer.toString();
      const allSignatories = [signerAddress, ...otherSignatories].map((s) => this.root.formatAddress(s));

      const approvalsArray = approvals.toHuman() as string[];
      const numApprovals = approvalsArray.length;

      const multisigInfoExtended = {
        threshold: threshold,
        signatories: allSignatories,
        walletsApproved: approvalsArray.map((s) => this.root.formatAddress(s)),
        numApprovals: numApprovals,
      };

      const multisigAccount = this.getMstAccount(this.root.formatAddress(mstAccount));
      if (!multisigAccount) {
        throw new Error(`Multisig account with address ${mstAccount} not found.`);
      }

      const meta = multisigAccount.meta as any;
      if (!meta) {
        throw new Error(`Metadata for multisig account ${mstAccount} is missing.`);
      }

      const deadlineInBlocks = meta.deadlineInBlocks as number;
      if (!deadlineInBlocks) {
        throw new Error(`Deadline is not set in the metadata of the multisig account ${mstAccount}.`);
      }
      const creationBlockNumber = when.height.toNumber();
      const expirationBlockNumber = creationBlockNumber + deadlineInBlocks;

      const currentHeader = await this.root.api.rpc.chain.getHeader();
      const currentBlockNumber = currentHeader.number.toNumber();

      const blocksUntilExpiration = expirationBlockNumber - currentBlockNumber;

      if (blocksUntilExpiration <= 0) {
        return null;
      }
      const blockTimeInSeconds = 6;
      const secondsUntilExpiration = blocksUntilExpiration * blockTimeInSeconds;

      const deadlineTrx = {
        expirationBlock: expirationBlockNumber,
        blocksRemaining: blocksUntilExpiration,
        secondsRemaining: secondsUntilExpiration,
      };

      const blockTimestamp = await this.getBlockTimestamp(blockHash);
      const historyItem = await this.parseCallDataToHistoryItem(
        callDataHex,
        multisigInfoExtended,
        deadlineTrx,
        blockNumber,
        blockHash.toHex(),
        blockTimestamp,
        mstAccount
      );

      historyItem.id = callHash;
      historyItem.txId = callHash;
      historyItem.status = TransactionStatus.Pending;

      return historyItem;
    } else {
      console.warn('Extrinsic at specified index is not utility.batch');
      return null;
    }
  }

  private async getBlockTimestamp(blockHash: any): Promise<number> {
    const atApi = await this.root.api.at(blockHash);
    const timestamp = await atApi.query.timestamp.now();
    return Number(timestamp.toBigInt());
  }
}
