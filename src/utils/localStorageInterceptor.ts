import { LOCAL_STORAGE_MAX_SIZE, LOCAL_STORAGE_LIMIT_PERCENTAGE } from '@/consts/index';
import { LocalStorageEvent } from '@/types/customEvent';
import { calculateLocalStorageSize, fillLocalStorage } from '@/utils/storage';

import { EventBus } from '../eventBus';

function calculateStorageUsagePercentage(): number {
  const currentSize = calculateLocalStorageSize();
  return (currentSize / LOCAL_STORAGE_MAX_SIZE) * 100;
}

// fillLocalStorage(96);
const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key: string, value: string) {
  const usagePercentage = calculateStorageUsagePercentage();
  console.info(`Current localStorage usage: ${usagePercentage.toFixed(2)}%`);

  if (usagePercentage >= LOCAL_STORAGE_LIMIT_PERCENTAGE) {
    console.warn(
      `Cannot write to localStorage. Usage exceeds ${LOCAL_STORAGE_LIMIT_PERCENTAGE}% (${usagePercentage.toFixed(2)}%)`
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
