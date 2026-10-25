export const JSON_INPUT_AUTOCOMPLETE_VALUES = ['off', 'on'] as const

export type JsonInputAutocomplete = (typeof JSON_INPUT_AUTOCOMPLETE_VALUES)[number]

export const JSON_INPUT_TYPE_VALUES = [
  'text',
  'textarea',
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'email',
  'text-file',
  'file',
  'hidden',
  'image',
  'month',
  'number',
  'password',
  'radio',
  'range',
  'reset',
  'search',
  'submit',
  'tel',
  'time',
  'url',
  'week',
] as const

export type JsonInputType = (typeof JSON_INPUT_TYPE_VALUES)[number]

export const JSON_INPUT_SIZE_VALUES = ['small', 'medium', 'big'] as const

export type JsonInputSize = (typeof JSON_INPUT_SIZE_VALUES)[number]
