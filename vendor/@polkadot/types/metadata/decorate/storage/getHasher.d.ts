/// <reference types="node" />
import type { StorageHasher } from '../../../interfaces';
export type HasherInput = string | Buffer | Uint8Array;
export type HasherFunction = (data: HasherInput) => Uint8Array;
/** @internal */
export declare function getHasher(hasher: StorageHasher): HasherFunction;
