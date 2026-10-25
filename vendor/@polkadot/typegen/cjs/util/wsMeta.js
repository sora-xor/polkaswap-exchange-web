'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.getMetadataViaWs = getMetadataViaWs;
exports.getRpcMethodsViaWs = getRpcMethodsViaWs;
exports.getRuntimeVersionViaWs = getRuntimeVersionViaWs;
var _xWs = require('@polkadot/x-ws');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

async function getWsData(endpoint, method) {
  return new Promise((resolve) => {
    try {
      const websocket = new _xWs.WebSocket(endpoint);
      websocket.onclose = (event) => {
        const msg = `disconnected, code: '${event.code}' reason: '${event.reason}'`;
        if (event.code === 1000) {
          console.log(msg);
        } else {
          console.error(msg);
          process.exit(1);
        }
      };
      websocket.onerror = (event) => {
        console.error(event);
        process.exit(1);
      };
      websocket.onopen = () => {
        console.log('connected');
        websocket.send(`{"id":"1","jsonrpc":"2.0","method":"${method}","params":[]}`);
      };
      websocket.onmessage = (message) => {
        resolve(JSON.parse(message.data).result);
        websocket.close();
      };
    } catch (error) {
      process.exit(1);
    }
  });
}
async function getMetadataViaWs(endpoint) {
  return getWsData(endpoint, 'state_getMetadata');
}
async function getRpcMethodsViaWs(endpoint) {
  const result = await getWsData(endpoint, 'rpc_methods');
  return result.methods;
}
async function getRuntimeVersionViaWs(endpoint) {
  const result = await getWsData(endpoint, 'state_getRuntimeVersion');
  return result.apis;
}
