export {};

import type Vue from 'vue';
import type VueI18n from 'vue-i18n';
import type VueRouter, { Route, RouteConfig } from 'vue-router';

declare module 'vue' {
  interface VueApp {
    use: (...args: any[]) => VueApp;
    mount: (selector: string | Element) => Vue;
    config: Record<string, any>;
    component: (...args: any[]) => VueApp;
    directive: (...args: any[]) => VueApp;
    provide: (key: any, value: any) => VueApp;
  }

  export function createApp(rootComponent: any, rootProps?: any): VueApp;
}

declare module 'vue-router' {
  interface RouterHistory {
    mode: 'hash' | 'history' | 'abstract';
  }

  export type RouteRecordRaw = RouteConfig;

  export function createWebHashHistory(): RouterHistory;
  export function createRouter(options: { history: RouterHistory; routes: RouteConfig[] }): VueRouter & {
    currentRoute: { value: Route };
  };
}

declare module 'vue-i18n' {
  export interface CreateI18nOptions {
    locale: string;
    fallbackLocale?: string | string[];
    messages?: Record<string, any>;
    legacy?: boolean;
    globalInjection?: boolean;
    warnHtmlMessage?: boolean;
  }

  export interface I18nWrapper {
    global: VueI18n;
  }

  export function createI18n(options: CreateI18nOptions): I18nWrapper;
}
