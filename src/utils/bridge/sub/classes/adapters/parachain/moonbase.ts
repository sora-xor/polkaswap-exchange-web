import { u8aToHex, u8aToU8a } from '@polkadot/util';
import { decodeAddress, addressToEvm } from '@polkadot/util-crypto';
import { ethers } from 'ethers';

import ethersUtil from '@/utils/ethers-util';

import { SubAdapter } from '../substrate';

export class MoonbaseParachainAdapter extends SubAdapter {
  // overrides SubAdapter method
  public formatAddress = (address?: string): string => {
    if (!address) return '';

    const publicKey = decodeAddress(address);
    console.log(publicKey);
    const internalAddressHex = ethersUtil.accountAddressToHex(address);
    const keccakHex = ethers.keccak256(internalAddressHex);

    console.log('pk', internalAddressHex);
    console.log('keccak', keccakHex);

    const key = keccakHex.slice(-40);

    console.log('key', key);

    return `0x${key}`;

    // const addressBytes = Buffer.from(decodeAddress(address))
    // const prefixBytes = Buffer.from('1287');
    // const n = Uint8Array.from(Buffer.concat([ prefixBytes, addressBytes ]));

    // return u8aToHex(n);

    // const publicKey = u8aToHex(decodeAddress(address));

    // return publicKey;
  };
}
