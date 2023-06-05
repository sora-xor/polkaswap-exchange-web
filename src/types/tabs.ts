export enum AlertTypeTabs {
  Drop = 'drop',
  Raise = 'raise',
}

export enum AlertFrequencyTabs {
  Once = 'once',
  Always = 'always',
}

export interface TabItem {
  name: string;
  label: string;
  content?: string;
}
