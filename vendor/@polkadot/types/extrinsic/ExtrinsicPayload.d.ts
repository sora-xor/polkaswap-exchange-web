import type { AnyJson, BareOpts, Registry } from '@polkadot/types-codec/types';
import type { HexString } from '@polkadot/util/types';
import type { BlockHash } from '../interfaces/chain';
import type { ExtrinsicPayloadV4 } from '../interfaces/extrinsics';
import type { ExtrinsicPayloadValue, ICompact, IKeyringPair, INumber } from '../types';
import { AbstractBase, Bytes } from '@polkadot/types-codec';
import { GenericExtrinsicEra } from './ExtrinsicEra';
interface ExtrinsicPayloadOptions {
  version?: number;
}
type ExtrinsicPayloadVx = ExtrinsicPayloadV4;
/**
 * @name GenericExtrinsicPayload
 * @description
 * A signing payload for an [[Extrinsic]]. For the final encoding, it is variable length based
 * on the contents included
 */
export declare class GenericExtrinsicPayload extends AbstractBase<ExtrinsicPayloadVx> {
  constructor(
    registry: Registry,
    value?: Partial<ExtrinsicPayloadValue> | Uint8Array | string,
    { version }?: ExtrinsicPayloadOptions
  );
  /**
   * @description The block [[BlockHash]] the signature applies to (mortal/immortal)
   */
  get blockHash(): BlockHash;
  /**
   * @description The [[ExtrinsicEra]]
   */
  get era(): GenericExtrinsicEra;
  /**
   * @description The genesis block [[BlockHash]] the signature applies to
   */
  get genesisHash(): BlockHash;
  /**
   * @description The [[Bytes]] contained in the payload
   */
  get method(): Bytes;
  /**
   * @description The [[Index]]
   */
  get nonce(): ICompact<INumber>;
  /**
   * @description The specVersion as a [[u32]] for this payload
   */
  get specVersion(): INumber;
  /**
   * @description The [[Balance]]
   */
  get tip(): ICompact<INumber>;
  /**
   * @description The transaction version as a [[u32]] for this payload
   */
  get transactionVersion(): INumber;
  /**
   * @description Compares the value of the input to see if there is a match
   */
  eq(other?: unknown): boolean;
  /**
   * @description Sign the payload with the keypair
   */
  sign(signerPair: IKeyringPair): {
    signature: HexString;
  };
  /**
   * @description Converts the Object to to a human-friendly JSON, with additional fields, expansion and formatting of information
   */
  toHuman(isExtended?: boolean): AnyJson;
  /**
   * @description Converts the Object to JSON, typically used for RPC transfers
   */
  toJSON(): any;
  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType(): string;
  /**
   * @description Returns the string representation of the value
   */
  toString(): string;
  /**
   * @description Returns a serialized u8a form
   */
  toU8a(isBare?: BareOpts): Uint8Array;
}
export {};
