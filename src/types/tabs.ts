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
