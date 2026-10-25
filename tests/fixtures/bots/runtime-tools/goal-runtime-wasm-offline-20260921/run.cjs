/** The OS must deny sockets before either binary is opened or executed. */
'use strict';
const assert = require('node:assert/strict');
const { createConnection } = require('node:net');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { PROFILES, loadBinary, checkCoreVersion, invoke, quoteInput } = require('./runtime-host.cjs');
/** Loopback syscall probe must be denied by the sandbox itself, not merely refused by an absent server. */
async function assertNetworkDenied() {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: 9 });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(Error('network-denial-check-timeout'));
    }, 1000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      reject(Error('network-not-denied'));
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      if (error.code !== 'EPERM') return reject(Error(`network-not-denied:${error.code}`));
      resolve({ target: '127.0.0.1:9', code: error.code, syscall: error.syscall, networkPacketsSent: 0 });
    });
  });
}
/** Bounded readiness execution only; no ledger, state fixture, fee or admission assertion is made. */
async function main(directory) {
  const denial = await assertNetworkDenied();
  mkdirSync(directory, { recursive: true });
  const records = [],
    sourceHashes = {};
  for (const name of ['run.cjs', 'runtime-host.cjs', 'network-deny.sb']) {
    const bytes = readFileSync(join(__dirname, name));
    sourceHashes[name] = createHash('sha256').update(bytes).digest('hex');
  }
  writeFileSync(
    join(directory, 'protocol.json'),
    JSON.stringify(
      {
        kind: 'offline-runtime-readiness-v1',
        networkDenial: denial,
        sourceHashes,
        profiles: PROFILES,
        stateFixture: 'none; storage calls must trap',
        signatureVerification: 'unsupported and traps',
        feesProven: false,
        equivalenceProven: false,
        runtimeAdmissionGranted: false,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  for (const profile of PROFILES) {
    const path = resolve(__dirname, '../../runtime-artifacts', `runtime-${profile.version}.compact.compressed.wasm`);
    const binary = loadBinary(profile, path);
    const core = checkCoreVersion(binary);
    const quoteBoundary = invoke(binary, 'LiquidityProxyAPI_quote', quoteInput());
    assert.equal(quoteBoundary.success, false, 'empty-fixture-must-not-quote');
    const record = {
      profile,
      path,
      compressedBytes: binary.compressedBytes,
      wasmSha256: binary.wasmSha256,
      core,
      quoteBoundary,
    };
    writeFileSync(join(directory, `runtime-${profile.version}.json`), JSON.stringify(record, null, 2) + '\n', {
      flag: 'wx',
    });
    records.push(record);
  }
  const result = {
    kind: 'offline-runtime-readiness-result-v1',
    complete: true,
    networkDenial: denial,
    runtimeVersions: records.map((r) => r.core.decoded.specVersion),
    firstQuoteDependencies: records.map((r) => ({
      version: r.profile.version,
      error: r.quoteBoundary.error,
      lastHostCall: r.quoteBoundary.hostCalls.at(-1),
    })),
    coreVersionExportExecuted: true,
    customSectionUsedInstead: false,
    remoteStateReads: 0,
    walletCalls: 0,
    transactionSubmissions: 0,
    fixtureReady: false,
    economicEquivalence: false,
    runtimeAdmissionGranted: false,
  };
  writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}
if (require.main === module)
  main(resolve(process.argv[2] || join(__dirname, 'episode')))
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
module.exports = { assertNetworkDenied, main };
