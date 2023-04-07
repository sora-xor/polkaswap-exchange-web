export interface Alert {
  token: string;
  price: string;
  type: 'onDrop' | 'onRaise';
  once: boolean;
}
