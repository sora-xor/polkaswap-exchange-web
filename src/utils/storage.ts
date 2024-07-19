import { Storage } from '@sora-substrate/util';
import { storage as soraStorage } from '@soramitsu/soraneo-wallet-web';

export { settingsStorage } from '@soramitsu/soraneo-wallet-web';

export default soraStorage;

export const layoutsStorage = new Storage('layouts');

export function calculateLocalStorageSize(): number {
  let totalSize = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const value = localStorage[key];
      const keySize = key.length * 2;
      const valueSize = value.length * 2;
      totalSize += keySize + valueSize;
    }
  }
  return totalSize;
}

export function fillLocalStorage(targetPercentage: number): void {
  const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
  const currentSize = calculateLocalStorageSize();
  const targetSize = (targetPercentage / 100) * MAX_STORAGE_SIZE;
  const sizeToFill = targetSize - currentSize;

  if (sizeToFill <= 0) {
    console.warn('LocalStorage is already filled to or beyond the target percentage.');
    return;
  }

  const filler = 'x'.repeat(sizeToFill / 2); // Each character is 2 bytes (UTF-16)
  try {
    localStorage.setItem('fillerKey', filler);
    console.info(`Filled localStorage to approximately ${targetPercentage}%`);
  } catch (e) {
    console.error('Failed to fill localStorage:', e);
  }
}
