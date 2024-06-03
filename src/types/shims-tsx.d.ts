import { Telegram } from '@twa-dev/types';
import Vue, { VNode } from 'vue';

declare global {
  interface Window {
    Telegram: Telegram;
  }
  namespace JSX {
    // tslint:disable no-empty-interface
    interface Element extends VNode {}
    // tslint:disable no-empty-interface
    interface ElementClass extends Vue {}
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
