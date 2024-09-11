import { Storage } from '@sora-substrate/sdk';
import { storage as soraStorage } from '@soramitsu/soraneo-wallet-web';

import { LOCAL_STORAGE_MAX_SIZE, listOfRemoveForLocalStorage } from '@/consts/index';
export { settingsStorage } from '@soramitsu/soraneo-wallet-web';

export default soraStorage;

export const layoutsStorage = new Storage('layouts');

function calculateLocalStorageSize(): number {
  let totalSize = 0;
  for (const key in localStorage) {
    if (Object.hasOwn(localStorage, key)) {
      const value = localStorage[key];
      const keySize = key.length * 2;
      const valueSize = value.length * 2;
      totalSize += keySize + valueSize;
    }
  }
  return totalSize;
}

export function calculateStorageUsagePercentage(): number {
  const currentSize = calculateLocalStorageSize();
  return (currentSize / LOCAL_STORAGE_MAX_SIZE) * 100;
}

export function clearLocalStorage() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && listOfRemoveForLocalStorage.some((item) => key.includes(item))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
