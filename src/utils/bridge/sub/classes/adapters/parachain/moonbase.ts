import { FPNumber, TransactionStatus } from '@sora-substrate/util';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import BN from 'bignumber.js';

import xTokensAbi from '@/abi/ethereum/other/moonbeam/xTokens.json';
import { ZeroStringValue } from '@/consts';
import { SUB_NETWORKS } from '@/consts/sub';
import { delay } from '@/utils';
import { getEvmTransactionFee, onEvmTransactionPending } from '@/utils/bridge/common/utils';
import { getTransaction, updateTransaction } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import { ParachainAdapter } from './parachain';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, RegisteredAsset } from '@sora-substrate/util/build/assets/types';
import type { ethers } from 'ethers';

const MOONBASE_DATA = SUB_NETWORKS[SubNetworkId.AlphanetMoonbase];

export class MoonbaseParachainAdapter extends ParachainAdapter<string> {
  protected nativeAssetContractAddress = '0x0000000000000000000000000000000000000802';
  protected xTokensContractAddress = '0x0000000000000000000000000000000000000804';

  // overrides "WithConnectionApi"
  override get chainSymbol(): string | undefined {
    return MOONBASE_DATA?.nativeCurrency?.symbol;
  }

  // overrides "WithConnectionApi"
  public override formatAddress(address: string, _withPrefix = true): string {
    // return evm address without changes
    return address;
  }

  // overrides "SubAdapter"
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  // overrides "SubAdapter"
  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    return await this.assetsAccountRequest(accountAddress, asset.externalAddress);
  }

  // Assets has not minimal deposit on Moonbase
  // overrides "ParachainAdapter"
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    return ZeroStringValue;
  }

  // overrides "ParachainAdapter"
  public override async getAssetIdByMultilocation(asset: Asset, multilocation: any): Promise<string> {
    const assetType = {
      XCM: multilocation,
    };

    const result = await (this.api.query.assetManager as any).assetTypeId(assetType);

    if (result.isEmpty) return '';

    const id = result.unwrap().toString();

    return id;
  }

  // overrides "ParachainAdapter"
  public override assetIdToEvmContractAddress(id: string): string {
    const base = new BN(id).toString(16);
    const padded = base.padStart(40, 'f');
    return `0x${padded}`;
  }

  /**
   * Convert parachain id to xcm junction
   */
  protected toParachainAddress(id: number | undefined): string {
    const selector = '0x00'; // Parachain selector
    const address = Number(id ?? 0)
      .toString(16)
      .padStart(8, '0'); // bytes4

    return selector + address;
  }

  /**
   * Convert substrate account address to xcm junction
   */
  protected toAccountId32(address: string): string {
    const selector = '0x01'; // AccountKey32 selector
    const publicKey = this.getPublicKeyByAddress(address); // AccountId32 address in hex
    const networkOption = '00'; // Network(Option) Null

    return selector + publicKey + networkOption;
  }

  public override async transfer(
    asset: RegisteredAsset,
    recipient: string,
    amount: string | number,
    historyId: string
  ) {
    const currencyAddress =
      asset.symbol === this.chainSymbol
        ? this.nativeAssetContractAddress
        : this.assetIdToEvmContractAddress(asset.externalAddress);

    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();
    const weight = 5_000_000_000; // max weight, taken from successful xcm message on SORA parachain

    const parents = 1;
    const parachainJunction = this.toParachainAddress(this.getSoraParachainId());
    const accountJunction = this.toAccountId32(recipient);
    const interior = [parachainJunction, accountJunction]; // interior = X2 (the array has a length of 2)
    const destination = [parents, interior];

    const xTokens = await ethersUtil.getContract(this.xTokensContractAddress, xTokensAbi);

    const signedTx: ethers.TransactionResponse = await xTokens.transfer(currencyAddress, value, destination, weight);

    updateTransaction(historyId, {
      externalHash: signedTx.hash,
      externalNetworkFee: getEvmTransactionFee(signedTx),
      status: TransactionStatus.InBlock,
    });

    // wait a little to update tx in storage
    await delay();

    // run non blocking promise to update tx data
    onEvmTransactionPending(historyId, getTransaction, updateTransaction)
      .then(() => {
        updateTransaction(historyId, {
          status: TransactionStatus.Finalized,
        });
      })
      .catch(() => {
        updateTransaction(historyId, {
          status: TransactionStatus.Error,
        });
      });
  }
}
