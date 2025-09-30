import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

export function installCountryFlagEmoji(): void {
  if (typeof navigator === 'undefined') return;

  const userAgent = navigator.userAgent.toLowerCase();

  if (/windows/.test(userAgent) && !/firefox/.test(userAgent)) {
    polyfillCountryFlagEmojis();
  }
}
