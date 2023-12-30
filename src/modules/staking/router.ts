export const stakingLazyView = (name: string) => () => import(`@/modules/staking/views/${name}.vue`);

export const demeterStakingLazyComponent = (name: string) => () =>
  import(`@/modules/staking/demeter/components/${name}.vue`);
export const demeterStakingLazyView = (name: string) => () => import(`@/modules/staking/demeter/views/${name}.vue`);

export const soraStakingLazyComponent = (name: string) => () => import(`@/modules/staking/sora/components/${name}.vue`);
export const soraStakingLazyView = (name: string) => () => import(`@/modules/staking/sora/views/${name}.vue`);
