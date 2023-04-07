export enum AlertTypeTabs {
  Drop = 'Drop',
  Raise = 'Raise',
}

export enum AlertFrequencyTabs {
  Once = 'Once',
  Always = 'Always',
}

export interface TabItem {
  name: string;
  label: string;
  content?: string;
}
