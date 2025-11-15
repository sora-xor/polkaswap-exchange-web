import { assert } from '@polkadot/util';
import { map, Subject } from 'rxjs';
import { FPNumber } from '@sora-substrate/math';
import type { Observable } from '@polkadot/types/types';
import type { GenericExtrinsic } from '@polkadot/types';
import type { u32, Vec, u128 } from '@polkadot/types-codec';
import type { AnyTuple } from '@polkadot/types-codec/types';
import type { FrameSystemEventRecord, FrameSystemLastRuntimeUpgradeInfo } from '@polkadot/types/lookup';

import { Messages } from '../logger';
import { Operation } from '../types';
import type { Api } from '../api';

export class SystemModule<T> {
  constructor(private readonly root: Api<T>) {}

  private subject = new Subject<number>();
  public updated = this.subject.asObservable();

  get specVersion(): number {
    return this.root.api.consts.system.version.specVersion.toNumber();
  }

  public getChainDecimals(api = this.root.api): number {
    return api.registry.chainDecimals[0];
  }

  public getBlockNumberObservable(apiRx = this.root.apiRx): Observable<number> {
    return apiRx.query.system.number().pipe(
      map<u32, number>((codec) => {
        const blockNumber = codec.toNumber();

        this.subject.next(blockNumber);

        return blockNumber;
      })
    );
  }

  public getBlockHashObservable(blockNumber: number, apiRx = this.root.apiRx): Observable<string | null> {
    return apiRx.query.system.blockHash(blockNumber).pipe(
      map((hash) => {
        return hash.isEmpty ? null : hash.toString();
      })
    );
  }

  public async getRuntimeVersion(api = this.root.api): Promise<number | null> {
    const data = await api.query.system.lastRuntimeUpgrade();
    const systemInfo: FrameSystemLastRuntimeUpgradeInfo | null = data.unwrapOr(null);
    return systemInfo?.specVersion?.toNumber?.() ?? null;
  }

  public getRuntimeVersionObservable(apiRx = this.root.apiRx): Observable<number | null> {
    return apiRx.query.system.lastRuntimeUpgrade().pipe<number | null>(
      map((data) => {
        const systemInfo: FrameSystemLastRuntimeUpgradeInfo | null = data.unwrapOr(null);
        return systemInfo?.specVersion?.toNumber?.() ?? null;
      })
    );
  }

  public getEventsObservable(apiRx = this.root.apiRx): Observable<Vec<FrameSystemEventRecord>> {
    return apiRx.query.system.events();
  }

  public async getBlockHash(blockNumber: number, api = this.root.api): Promise<string> {
    return (await api.rpc.chain.getBlockHash(blockNumber)).toString();
  }

  /**
   * Returns the block number.
   *
   * If `blockHash` is provided, the block number of the block with the given hash is returned.
   *
   * Otherwise, the block number of the latest block is returned.
   *
   * @param blockHash - The hash of the block for which the block number is requested.
   * @param api - The API instance to use.
   */
  public async getBlockNumber(blockHash?: string, api = this.root.api): Promise<number> {
    const apiInstanceAtBlock = !blockHash ? api : await api.at(blockHash);
    return (await apiInstanceAtBlock.query.system.number()).toNumber();
  }

  /**
   * Returns the timestamp of the block with the given hash.
   *
   * If `blockHash` is not provided, the timestamp of the latest block is returned.
   *
   * @param blockHash - The hash of the block for which the timestamp is requested.
   * @param api - The API instance to use.
   */
  public async getBlockTimestamp(blockHash: string, api = this.root.api): Promise<number> {
    const apiInstanceAtBlock = !blockHash ? api : await api.at(blockHash);
    return (await apiInstanceAtBlock.query.timestamp.now()).toNumber();
  }

  public async getCurrentTimestamp(api = this.root.api): Promise<number> {
    return (await api.query.timestamp.now()).toNumber();
  }

  public async getExtrinsicsFromBlock(
    blockId: string,
    api = this.root.api
  ): Promise<Array<GenericExtrinsic<AnyTuple>>> {
    const signedBlock = await api.rpc.chain.getBlock(blockId);
    return signedBlock.block?.extrinsics.toArray() ?? [];
  }

  public async getBlockEvents(blockId: string, api = this.root.api): Promise<Array<FrameSystemEventRecord>> {
    const apiInstanceAtBlock = await api.at(blockId);
    return (await apiInstanceAtBlock.query.system.events()).toArray();
  }

  /** NetworkFeeMultiplier is for the SORA network only */
  public async getNetworkFeeMultiplier(api = this.root.api): Promise<number> {
    const u128Data = await api.query.xorFee.multiplier();
    return new FPNumber(u128Data).toNumber();
  }

  /** NetworkFeeMultiplier is for the SORA network only */
  public getNetworkFeeMultiplierObservable(apiRx = this.root.apiRx): Observable<number> {
    return apiRx.query.xorFee.multiplier().pipe(map<u128, number>((u128Data) => new FPNumber(u128Data).toNumber()));
  }

  /** Check in for the **SORATOPIA** project */
  public checkin(): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.submitExtrinsic(this.root.api.tx.soratopia.checkIn(), this.root.account.pair, {
      type: Operation.Checkin,
    });
  }

  /** Get the current denomination coefficient */
  public async getDenominator(): Promise<number> {
    const api = this.root.api;
    const denominator = await api.query.denomination.denominator();
    return denominator.toNumber();
  }
}
