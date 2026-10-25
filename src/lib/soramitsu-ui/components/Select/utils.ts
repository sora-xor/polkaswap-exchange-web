import type { SelectOption, SelectOptionGroup } from '@soramitsu-ui/ui/components';

export function isSelectOptions(options: SelectOption[] | SelectOptionGroup[]): options is SelectOption[] {
  return options.length === 0 || 'label' in options[0];
}
