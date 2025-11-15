import type { BUTTON_ICON_POSITION_VALUES, BUTTON_SIZE_VALUES, BUTTON_TYPE_VALUES } from './consts';

export type ButtonType = (typeof BUTTON_TYPE_VALUES)[number];
export type ButtonSize = (typeof BUTTON_SIZE_VALUES)[number];
export type ButtonIconPosition = (typeof BUTTON_ICON_POSITION_VALUES)[number];

export type HTMLButtonType = 'button' | 'reset' | 'submit';
