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
  x1ex = 'X1History',
}

export interface TabItem {
  name: string;
  label: string;
  content?: string;
}
