import type { SelectOption, SelectOptionGroup } from '@/components'
import { SelectOptionType, SelectSize } from '@/components'

export const OPTIONS: SelectOption[] = [
  {
    label: 'Germany',
    value: 'du',
  },
  {
    label: 'England',
    value: 'en',
  },
  {
    label: 'United Arab Emirates',
    value: 'ae',
  },
  {
    label: 'Iceland',
    value: 'is',
  },
  {
    label: 'Japan',
    value: 'jp',
  },
]

export const OPTION_GROUPS: SelectOptionGroup[] = [
  {
    header: '1st group',
    selectAllBtn: true,
    items: [
      {
        label: 'Germany',
        value: 'du',
      },
      {
        label: 'England',
        value: 'en',
      },
      {
        label: 'United Arab Emirates',
        value: 'ae',
      },
    ],
  },
  {
    header: '2nd group',
    selectAllBtn: false,
    items: [
      {
        label: 'Iceland',
        value: 'is',
      },
      {
        label: 'Japan',
        value: 'jp',
      },
    ],
  },
]

export const COMMON_ARGS = {
  size: SelectSize.Md,
  optionType: SelectOptionType.Default,
  disabled: false,
  loading: false,
  multiple: false,
  label: 'Make a choice',
  noAutoClose: false,
  dropdownSearch: false,
  maxShownOptions: 0,
  mandatory: false,
}

export const COMMON_ARG_TYPES = {
  size: {
    control: 'inline-radio',
    options: Object.values(SelectSize),
  },
  optionType: {
    control: 'inline-radio',
    options: Object.values(SelectOptionType),
  },
}
