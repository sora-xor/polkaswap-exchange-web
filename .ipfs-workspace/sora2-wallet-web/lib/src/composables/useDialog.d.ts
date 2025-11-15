import type { Ref } from 'vue';
type EmitFn = (value: boolean) => void;
type UseDialogOptions = {
  emit?: EmitFn;
  onClose?: () => void;
};
export interface UseDialogResult {
  isVisible: Ref<boolean>;
  setVisible: (value: boolean) => void;
  closeDialog: () => void;
}
export declare function useDialogVisibility(propVisible: Ref<boolean>, options?: UseDialogOptions): UseDialogResult;
export {};
