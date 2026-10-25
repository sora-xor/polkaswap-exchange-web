import { ArrayLike } from '../assets/consts';
import { AssetTypes } from '../assets/types';

/** SBT name symbols to distinguish accounts for access
 * rights and functionalities
 */
export enum PrestoSymbols {
  PRACS = 'PRACS',
  PRCRDT = 'PRCRDT', // for creditors
  PRINVST = 'PRINVST', // for investors
}

export enum Role {
  Manager = 'Manager',
  Investor = 'Investor',
  Creditor = 'Creditor',
  Unknown = 'Unknown',
}

export const PrestoAssets = new ArrayLike([
  {
    address: '0x0600000000000000000000000000000000000000000000000000000000000000',
    symbol: PrestoSymbols.PRACS,
    name: 'Presto Access',
    type: AssetTypes.Soulbound,
  },
  {
    address: '0x0600010000000000000000000000000000000000000000000000000000000000',
    symbol: PrestoSymbols.PRINVST,
    name: 'Presto Investor',
    type: AssetTypes.Soulbound,
  },
  {
    address: '0x0600020000000000000000000000000000000000000000000000000000000000',
    symbol: PrestoSymbols.PRCRDT,
    name: 'Presto Creditor',
    type: AssetTypes.Soulbound,
  },
]);
