/** One offline, write-once synthetic route comparison. Never connects, signs with a wallet or admits a runtime. */
'use strict';
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { PROFILES, loadBinary, checkCoreVersion, quoteInput } = require('./runtime-host.cjs');
const { assertNetworkDenied } = require('./run.cjs');
const { invokeSynthetic } = require('./runtime-synthetic.cjs');
const { makeFixture, makeSwapFixture, decodeQuote, inspectSwap, decodeFees, storageCodec } = require('./fixture.cjs');
const sha = (b) => createHash('sha256').update(b).digest('hex');
/** Execute only predetermined synthetic cases, retain complete before/after state and actual export bytes. */
async function main(directory) {
  const networkDenial = await assertNetworkDenied();
  mkdirSync(directory, { recursive: true });
  const files = {};
  const save = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    assert(bytes.length <= 8 * 1024 * 1024, 'artifact-size');
    writeFileSync(join(directory, name), bytes, { flag: 'wx' });
    files[name] = { bytes: bytes.length, sha256: sha(bytes) };
  };
  const sourceHashes = Object.fromEntries(
    ['runtime-host.cjs', 'run.cjs', 'network-deny.sb', 'runtime-synthetic.cjs', 'fixture.cjs', 'run-synthetic.cjs'].map(
      (name) => [name, sha(readFileSync(join(__dirname, name)))]
    )
  );
  save('protocol.json', {
    kind: 'offline-runtime-synthetic-route-v2',
    networkDenial,
    sourceHashes,
    profiles: PROFILES,
    route: 'DEX0 XOR/KUSD XYK-only desired input native fee',
    synthetic: {
      poolXor: '1000000000000000000000',
      poolKusd: '10000000000000000000000',
      payerXor: '3000000000000000000',
      payerKusd: '10000000000000000000',
      feeAccountXor: '1000000000000000000',
      nativeFeeMultiplier: '1000000000000000000',
      signature: 'real Ed25519; public deterministic test seed 0x42 repeated32',
      era: { period: 64, birth: 128, current: 129 },
    },
    cases: [
      'quote:5 KUSD to XOR',
      'quote:1 XOR to KUSD',
      'each direction:minimum exactly quoted output',
      'each direction:minimum one codec unit above quote',
      'each direction:invalid signature',
    ],
    scope:
      'Finite artificial fixture only; no production cost ceiling, profitability, economic qualification or runtime admission.',
  });
  const profiles = [];
  for (const p of PROFILES) {
    const binary = loadBinary(
      p,
      resolve(__dirname, '../../runtime-artifacts', `runtime-${p.version}.compact.compressed.wasm`)
    );
    const fixture = makeFixture(p, binary);
    save(`metadata-${p.version}.json`, {
      binding: fixture.metadataBinding,
      actualExport: fixture.metadataExecution,
      core: checkCoreVersion(binary),
    });
    save(`quote-fixture-${p.version}.json`, {
      metadataBinding: fixture.metadataBinding,
      declarations: fixture.declarations,
      emptyPrefixes: fixture.emptyPrefixes,
      state: fixture.state,
    });
    const directions = [];
    for (const reverse of [false, true]) {
      const label = reverse ? 'xor-kusd' : 'kusd-xor';
      const quoted = invokeSynthetic(
        binary,
        'LiquidityProxyAPI_quote',
        quoteInput(reverse),
        fixture.state,
        fixture.emptyPrefixes
      );
      assert(quoted.success, quoted.error);
      const quote = decodeQuote(quoted.resultHex, reverse);
      assert.deepEqual(quoted.postState, fixture.state, 'quote-mutated-state');
      save(`quote-${p.version}-${label}.json`, {
        inputHex: '0x' + quoteInput(reverse).toString('hex'),
        quote,
        actualExport: quoted,
      });
      const cases = [];
      for (const mode of ['success', 'minimum-failure', 'bad-signature']) {
        const min = (BigInt(quote.amount) + (mode === 'minimum-failure' ? 1n : 0n)).toString();
        const f = makeSwapFixture(p, binary, reverse, min, mode === 'bad-signature');
        const input = Buffer.concat([
          f.extrinsic,
          Buffer.from(f.registry.createType('u32', f.extrinsic.length).toU8a()),
        ]);
        let feeMethods = null;
        if (mode === 'success') {
          const info = invokeSynthetic(binary, 'TransactionPaymentApi_query_info', input, f.state, f.emptyPrefixes);
          const details = invokeSynthetic(
            binary,
            'TransactionPaymentApi_query_fee_details',
            input,
            f.state,
            f.emptyPrefixes
          );
          const decoded = decodeFees(f, info, details);
          assert.deepEqual(info.postState, f.state, 'fee-query-state');
          assert.deepEqual(details.postState, f.state, 'fee-query-state');
          feeMethods = { inputHex: '0x' + input.toString('hex'), info, details, decoded };
        }
        const actualExport = invokeSynthetic(
          binary,
          'BlockBuilder_apply_extrinsic',
          f.extrinsic,
          f.state,
          f.emptyPrefixes
        );
        const summary = inspectSwap(f, actualExport, quote);
        assert.equal(summary.dispatchSuccess, mode === 'success');
        assert.equal(summary.applied, mode !== 'bad-signature');
        if (feeMethods)
          assert(BigInt(summary.nativeFee) <= BigInt(feeMethods.decoded.partialFee), 'charged-over-estimate');
        const extrinsicKey = storageCodec(f.registry, f.metadata, 'System', 'ExtrinsicData', [0]).key;
        const comparableState = Object.fromEntries(
          Object.entries(actualExport.postState).filter(([key]) => key !== extrinsicKey)
        );
        const comparison = {
          mode,
          summary,
          feeMethods: feeMethods?.decoded ?? null,
          postStateExceptProfileSignedExtrinsicSha256: sha(JSON.stringify(comparableState)),
        };
        cases.push(comparison);
        save(`dispatch-${p.version}-${label}-${mode}.json`, {
          minimum: min,
          extrinsicHex: '0x' + f.extrinsic.toString('hex'),
          encodedLength: f.extrinsic.length,
          payloadHex: f.payloadHex,
          callHex: f.callHex,
          declaredState: f.state,
          declarations: f.declarations,
          emptyPrefixes: f.emptyPrefixes,
          payer: f.payer,
          pool: f.pool,
          feeAccount: f.fee,
          feeMethods,
          actualExport,
          summary,
        });
      }
      directions.push({ label, quote, cases });
    }
    const missing = { ...fixture.state };
    delete missing[fixture.declarations[0].key];
    const unknown = invokeSynthetic(binary, 'LiquidityProxyAPI_quote', quoteInput(), missing, fixture.emptyPrefixes);
    assert.equal(unknown.success, false);
    assert(unknown.error.startsWith('undeclared-storage:'));
    const scan = invokeSynthetic(binary, 'LiquidityProxyAPI_quote', quoteInput(), fixture.state, []);
    assert.equal(scan.success, false);
    assert(scan.error.startsWith('undeclared-prefix:'));
    save(`negative-controls-${p.version}.json`, { unknown, scan });
    profiles.push({ version: p.version, metadataBinding: fixture.metadataBinding, directions });
  }
  assert.deepEqual(profiles[0].directions, profiles[1].directions, 'fixture-route-difference');
  const result = {
    kind: 'offline-runtime-synthetic-route-result-v2',
    complete: true,
    networkDenial,
    profiles,
    finiteRouteCasesMatched: true,
    quoteCalls: 4,
    dispatchCalls: 12,
    feeMethodCalls: 8,
    unknownStorageAndScanRejected: true,
    realTestSignaturesVerified: true,
    invalidTestSignaturesRejected: true,
    remoteStateReads: 0,
    walletCalls: 0,
    networkExtrinsicSubmissions: 0,
    productionFeeCeilingProven: false,
    economicQualificationGranted: false,
    runtimeAdmissionGranted: false,
    files,
  };
  save('result.json', result);
  return result;
}
if (require.main === module)
  main(resolve(process.argv[2] || join(__dirname, 'synthetic-episode-v2')))
    .then((r) =>
      console.log(
        JSON.stringify({
          complete: r.complete,
          versions: r.profiles.map((p) => p.version),
          finiteRouteCasesMatched: r.finiteRouteCasesMatched,
          quoteCalls: r.quoteCalls,
          dispatchCalls: r.dispatchCalls,
          feeMethodCalls: r.feeMethodCalls,
          runtimeAdmissionGranted: false,
        })
      )
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
module.exports = { main };
