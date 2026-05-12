import { Storage } from '@/lib/substrate/sdk/storage';

import { LOCAL_STORAGE_MAX_SIZE, listOfRemoveForLocalStorage } from '@/consts/storage';

// Keep storage self contained to avoid circular imports with the wallet bundle.
export const settingsStorage = new Storage('dexSettings');
const soraStorage = new Storage('wallet');

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
