import { ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { useWrappedTransitionVisibility } from '@/lib/soramitsu-ui/components/Popover/util';

describe('useWrappedTransitionVisibility', () => {
  it('keeps wrapper and content detached until a non-eager popover is shown', () => {
    const show = ref(false);
    const eager = ref(false);
    const state = useWrappedTransitionVisibility({ show, eager });

    expect(state.wrapperIf.value).toBe(false);
    expect(state.wrapperShow.value).toBe(true);
    expect(state.contentIf.value).toBe(false);
    expect(state.contentShow.value).toBe(true);
    expect(state.transitionProps.appear).toBe(true);

    show.value = true;

    expect(state.wrapperIf.value).toBe(true);
    expect(state.contentIf.value).toBe(true);

    state.transitionProps.onBeforeEnter?.();
    show.value = false;

    expect(state.wrapperIf.value).toBe(true);
    expect(state.contentIf.value).toBe(false);

    state.transitionProps.onAfterLeave?.();

    expect(state.wrapperIf.value).toBe(false);
  });

  it('mounts eagerly without appearing when initially hidden', () => {
    const show = ref(false);
    const eager = ref(true);
    const state = useWrappedTransitionVisibility({ show, eager });

    expect(state.wrapperIf.value).toBe(true);
    expect(state.wrapperShow.value).toBe(false);
    expect(state.contentIf.value).toBe(true);
    expect(state.contentShow.value).toBe(false);
    expect(state.transitionProps.appear).toBe(false);

    show.value = true;

    expect(state.wrapperIf.value).toBe(true);
    expect(state.wrapperShow.value).toBe(true);
    expect(state.contentIf.value).toBe(true);
    expect(state.contentShow.value).toBe(true);
  });
});
