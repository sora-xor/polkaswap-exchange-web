import { createPinia, setActivePinia, type Pinia } from 'pinia';

const PINIA_SCOPE_TOKEN = '__PS_ACTIVE_PINIA__';

const getGlobalScope = (): Record<string, unknown> => globalThis as Record<string, unknown>;

let sharedPinia: Pinia | null = null;

const registerGlobalPinia = (instance: Pinia): Pinia => {
  sharedPinia = instance;
  setActivePinia(sharedPinia);
  getGlobalScope()[PINIA_SCOPE_TOKEN] = sharedPinia;
  return sharedPinia;
};

export const resolveGlobalPinia = (): Pinia => {
  if (sharedPinia) return sharedPinia;

  const scope = getGlobalScope();
  const existing = scope[PINIA_SCOPE_TOKEN] as Pinia | undefined;

  if (existing) {
    sharedPinia = existing;
    setActivePinia(sharedPinia);
    return sharedPinia;
  }

  return registerGlobalPinia(createPinia());
};

const pinia = resolveGlobalPinia();

export default pinia;
