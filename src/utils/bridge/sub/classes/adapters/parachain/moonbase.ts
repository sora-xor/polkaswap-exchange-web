import { FPNumber } from '@sora-substrate/util';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import BN from 'bignumber.js';

import xTokensAbi from '@/abi/ethereum/other/moonbeam/xTokens.json';
import { ZeroStringValue } from '@/consts';
import { SUB_NETWORKS } from '@/consts/sub';
import ethersUtil from '@/utils/ethers-util';

import { ParachainAdapter } from './parachain';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

const MOONBASE_DATA = SUB_NETWORKS[SubNetworkId.AlphanetMoonbase];

type IMoonbaseAssetId = string;

export class MoonbaseParachainAdapter extends ParachainAdapter<IMoonbaseAssetId> {
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

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  public async getAssetIdByMultilocation(multilocation: any): Promise<string | null> {
    const assetType = {
      XCM: multilocation,
    };

    const result = await (this.api.query.assetManager as any).assetTypeId(assetType);

    if (result.isEmpty) return null;

    const id = result.unwrap().toString();

    return id;
  }

  protected assetIdToEvmContractAddress(id: string): string {
    const base = new BN(id).toString(16);
    const padded = base.padStart(40, 'f');
    return `0x${padded}`;
  }

  protected toParachainAddress(id: number | undefined): string {
    const selector = '0x00'; // Parachain selector
    const address = Number(id ?? 0)
      .toString(16)
      .padStart(8, '0'); // bytes4

    return selector + address;
  }

  protected toAccountId32(address: string): string {
    const selector = '0x01'; // AccountKey32 selector
    const publicKey = this.getPublicKeyByAddress(address); // AccountId32 address in hex
    const networkOption = '00'; // Network(Option) Null

    return selector + publicKey + networkOption;
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number) {
    let currencyAddress = this.nativeAssetContractAddress;

    if (asset.symbol !== this.chainSymbol) {
      const assetMeta = this.getAssetMeta(asset);

      if (!assetMeta) throw new Error(`[${this.constructor.name}] Asset not found`);

      currencyAddress = this.assetIdToEvmContractAddress(assetMeta.id);
    }

    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();
    const weight = 5_000_000_000; // max waight, taken from successful xcm message on SORA parachain

    const parents = 1;
    const parachainJunction = this.toParachainAddress(this.getSoraParachainId());
    const accountJunction = this.toAccountId32(recipient);
    const interior = [parachainJunction, accountJunction]; // interior = X2 (the array has a length of 2)
    const destination = [parents, interior];

    const xTokens = await ethersUtil.getContract(this.xTokensContractAddress, xTokensAbi);

    const transaction = await xTokens.transfer(currencyAddress, value, destination, weight);

    // Waits for the transaction to be included in a block
    await transaction.wait();
    console.log(transaction);
  }
}
