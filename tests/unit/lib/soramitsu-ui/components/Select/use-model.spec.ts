import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useSelectModel } from '@/lib/soramitsu-ui/components/Select/use-model';

describe('useSelectModel', () => {
  it('manages single selection, replaces remembered options, and triggers auto-close hooks', () => {
    const onAutoClose = vi.fn();
    const model = ref<null | string>(null);
    const selectModel = useSelectModel({
      multiple: ref(false),
      model,
      options: ref([
        { label: 'One', value: '1' },
        { label: 'Two', value: '2' },
      ]),
      storeSelectedOptions: ref(true),
      singleModeAutoClose: ref(true),
      onAutoClose,
      mandatory: ref(false),
    });

    selectModel.select('1');
    expect(model.value).toBe('1');
    expect(selectModel.selectedOptions.value).toEqual([{ label: 'One', value: '1' }]);
    expect(selectModel.isValueSelected('1')).toBe(true);

    selectModel.select('2');
    expect(model.value).toBe('2');
    expect(selectModel.selectedOptions.value).toEqual([{ label: 'Two', value: '2' }]);

    selectModel.unselect('2');
    expect(model.value).toBeNull();
    expect(selectModel.selectedOptions.value).toEqual([]);
    expect(selectModel.isSomethingSelected.value).toBe(false);
    expect(onAutoClose).toHaveBeenCalledTimes(3);
  });

  it('toggles grouped options and respects mandatory selection guards', () => {
    const group = {
      header: 'Letters',
      items: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    };
    const model = ref<string[]>(['a']);
    const selectModel = useSelectModel({
      multiple: ref(true),
      model,
      options: ref([group]),
      storeSelectedOptions: ref(false),
      singleModeAutoClose: ref(false),
      onAutoClose: vi.fn(),
      mandatory: ref(true),
    });

    selectModel.toggleSelection('a');
    expect(model.value).toEqual(['a']);

    selectModel.toggleGroupSelection(group);
    expect(model.value).toEqual(['a', 'b']);
    expect(selectModel.isGroupSelected(group)).toBe(true);

    selectModel.toggleGroupSelection(group);
    expect(model.value).toEqual(['a', 'b']);
  });

  it('keeps placeholders for externally supplied values and converts model shape when mode changes', async () => {
    const multiple = ref(false);
    const model = ref<null | string | string[]>('ghost');
    const selectModel = useSelectModel({
      multiple,
      model,
      options: ref([{ label: 'Known', value: 'known' }]),
      storeSelectedOptions: ref(true),
      singleModeAutoClose: ref(false),
      onAutoClose: vi.fn(),
      mandatory: ref(false),
    });

    expect(selectModel.selectedOptions.value).toEqual([{ label: '', value: 'ghost' }]);

    multiple.value = true;
    await nextTick();
    expect(model.value).toEqual(['ghost']);

    model.value = ['known'];
    await nextTick();
    expect(selectModel.selectedOptions.value).toEqual([{ label: 'Known', value: 'known' }]);

    multiple.value = false;
    await nextTick();
    expect(model.value).toBe('known');
  });
});
