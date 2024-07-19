import { LocalStorageEvent } from '@/types/customEvent';
import { calculateLocalStorageSize } from '@/utils/storage';

import { EventBus } from '../eventBus';

const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key: string, value: string) {
  console.info('we will now set the item');
  console.info('the key is', key);

  const localStorageSize = calculateLocalStorageSize();
  console.info('Current localStorage size:', localStorageSize, 'KB');
  if (key === 'sora.slippageTolerance') {
    console.info('we will not save end will emit');
    EventBus.$emit('showSlippageWarning');
    return;
  }
  const event: LocalStorageEvent = new Event('itemInserted') as LocalStorageEvent;
  event.value = value;
  event.key = key;
  window.dispatchEvent(event);
  originalSetItem.call(this, key, value);
};

// Слушаем кастомное событие и эмитируем его через EventBus
window.addEventListener('itemInserted', function (e: Event) {
  const customEvent = e as LocalStorageEvent; // Приведение типа
  EventBus.$emit('localStorageChanged', { key: customEvent.key, value: customEvent.value });
});
