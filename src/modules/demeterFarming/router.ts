export const demeterLazyComponent = (name: string) => () => import(`@/modules/demeterFarming/components/${name}.vue`);
export const demeterLazyView = (name: string) => () => import(`@/modules/demeterFarming/views/${name}.vue`);
