export enum OrderBookTabs {
  Limit = 'limit',
  Market = 'market',
}

export enum AlertTypeTabs {
  Drop = 'drop',
  Raise = 'raise',
}

export enum AlertFrequencyTabs {
  Once = 'once',
  Always = 'always',
}

export enum FiatOptionTabs {
  moonpay = 'MoonpayHistory',
}

export interface TabItem {
  name: string;
  label: string;
  content?: string;
}

/** Used for ResponsiveTabs.vue */
export type ResponsiveTab = {
  /** Key */
  name: string;
  /** Displayed label, might be used with i18n */
  label: string;
  icon?: string;
};
