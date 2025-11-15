import { LibraryDesignSystem } from '../../types/common';
import { SettingsState } from './types';

declare const getters: {
  currencySymbol(state: SettingsState, getters: any, rootState: any, rootGetters: any): string;
  exchangeRate(state: SettingsState, getters: any, rootState: any, rootGetters: any): number;
  libraryTheme(state: SettingsState, getters: any, rootState: any, rootGetters: any): import('../../consts').Theme;
  libraryDesignSystem(state: SettingsState, getters: any, rootState: any, rootGetters: any): LibraryDesignSystem;
};
export default getters;
