export const adarLazyComponent = (name: string) => () => import(`@/modules/ADAR/components/${name}.vue`);
export const adarLazyView = (name: string) => () => import(`@/modules/ADAR/views/${name}.vue`);
