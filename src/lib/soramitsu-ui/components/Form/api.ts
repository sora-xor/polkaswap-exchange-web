import { inject, type InjectionKey, type Ref } from 'vue';

export type FormRule = {
  required?: boolean;
  message?: string;
  trigger?: string;
  validator?: (
    rule: FormRule,
    value: unknown,
    callback: (error?: Error) => void
  ) => void | boolean | Error | Promise<void>;
};

export type FormRules = Record<string, FormRule[]>;

export type FormContext = {
  errors: Ref<Record<string, string>>;
  showMessage: Ref<boolean>;
};

export const FORM_CONTEXT_KEY: InjectionKey<FormContext> = Symbol('SFormContext');

export function useFormContext(): FormContext | null {
  return inject(FORM_CONTEXT_KEY, null);
}
