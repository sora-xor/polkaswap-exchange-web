// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0
/// <reference lib="WebWorker" />

// export empty type because of tsc --isolatedModules flag
export type {};
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', async () => {
  console.info('WORKER:install');
});

self.addEventListener('message', ({ data }) => {
  console.info('WORKER:message');
  return data;
});

self.addEventListener('activate', () => {
  console.info('WORKER:activate');
});

// initial setup
