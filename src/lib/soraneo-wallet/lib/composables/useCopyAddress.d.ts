type CopyEvent = PointerEvent | MouseEvent | undefined;
export declare function useCopyAddress(): {
  wasAddressCopied: import('vue').Ref<boolean, boolean>;
  handleCopyAddress: (address: string, event?: CopyEvent) => Promise<void>;
  copyTooltip: (tooltipCopyValue?: string) => string;
};
export {};
