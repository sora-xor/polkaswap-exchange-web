import { Component, Vue } from 'vue-property-decorator';

import { state } from '@/store/decorators';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

@Component
export default class ValidatorsMixin extends Vue {
  @state.staking.historyDepth historyDepth!: Nullable<number>;

  formatName(validator: ValidatorInfoFull, maxLength = 20) {
    const name = validator.identity?.info.display ? validator.identity?.info.display : validator.address;
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  }
}
