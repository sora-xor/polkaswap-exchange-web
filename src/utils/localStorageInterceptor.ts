import { LocalStorageEvent } from '@/types/customEvent';
import { calculateLocalStorageSize, fillLocalStorage } from '@/utils/storage';

import { EventBus } from '../eventBus';

const MAX_STORAGE_SIZE = 4 * 1024 * 1024;
const STORAGE_LIMIT_PERCENTAGE = 95;

function calculateStorageUsagePercentage(): number {
  const currentSize = calculateLocalStorageSize();
  return (currentSize / MAX_STORAGE_SIZE) * 100;
}

const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key: string, value: string) {
  console.info('we will now set the item');
  console.info('the key is', key);
  // fillLocalStorage(96);
  const usagePercentage = calculateStorageUsagePercentage();
  console.info(`Current localStorage usage: ${usagePercentage.toFixed(2)}%`);

  if (usagePercentage >= STORAGE_LIMIT_PERCENTAGE) {
    console.warn(
      `Cannot write to localStorage. Usage exceeds ${STORAGE_LIMIT_PERCENTAGE}% (${usagePercentage.toFixed(2)}%)`
    );
    EventBus.$emit('storageLimitExceeded');
    return;
  }

  const event: LocalStorageEvent = new Event('itemInserted') as LocalStorageEvent;
  event.value = value;
  event.key = key;
  window.dispatchEvent(event);
  originalSetItem.call(this, key, value);
};

window.addEventListener('itemInserted', function (e: Event) {
  const customEvent = e as LocalStorageEvent;
  EventBus.$emit('localStorageChanged', { key: customEvent.key, value: customEvent.value });
});
