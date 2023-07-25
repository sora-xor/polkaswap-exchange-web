export const demeterLazyComponent = (name: string) => () => import(`@/modules/staking/components/${name}.vue`);
export const demeterLazyView = (name: string) => () => import(`@/modules/staking/views/${name}.vue`);
