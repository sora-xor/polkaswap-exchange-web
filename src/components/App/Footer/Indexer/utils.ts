import { IndexerType } from '@soramitsu/soraneo-wallet-web/lib/consts';

export function getIndexerName(type: IndexerType): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}
