import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

if (/windows/.test(navigator.userAgent.toLowerCase()) && !/firefox/.test(navigator.userAgent.toLowerCase())) {
  polyfillCountryFlagEmojis();
}
