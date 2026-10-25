// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  verifyAccumulationNativeMark,
  isVerifiedAccumulationNativeMark,
  AccumulationNativeMarkError,
} from '../../../../scripts/bots/accumulation-native-mark';
import type { AccumulationRpcReceipt } from '../../../../scripts/bots/accumulation-evidence-bridge';
import {
  createAccumulationNativeMarkFixture as fixture,
  repinNativeMarkFixture as repin,
  nativeMarkSha,
  nativeMarkHash,
  NATIVE_MARK_H as H,
} from './fixtures/accumulation-native-mark-fixture';
import { hex, le } from './fixtures/historical-goal-bound-fee-fixture';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
type Json = Record<string, any>;
function response(r: AccumulationRpcReceipt, edit: (v: Json) => void) {
  const parsed = JSON.parse(r.responseBody!);
  edit(parsed);
  r.responseBody = JSON.stringify(parsed);
  r.responseSha256 = nativeMarkSha(r.responseBody);
}
function verify(f = fixture()) {
  return verifyAccumulationNativeMark(f.raw, f.trusted, f.slot);
}
function setTargetTime(f: ReturnType<typeof fixture>, at: number) {
  response(f.raw.contextRpc.at(-1)!, (v) => {
    v.result[0].changes.find((c: string[]) => c[0] === f.keys.timestamp)[1] = hex(le(at, 8));
  });
  repin(f);
}
afterEach(() => vi.unstubAllGlobals());

describe('offline accumulation native mark verifier', () => {
  it('derives exact target reserve ratio and full mark without quotes, fees or network', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const f = fixture(),
      result = verify(f);
    expect(isVerifiedAccumulationNativeMark(result)).toBe(true);
    expect(result.mark).toEqual({
      blockHash: nativeMarkHash(100),
      blockNumber: 100,
      observedAtMs: H - 1000,
      receivedAtMs: f.slot.timing.contextReceivedAtMs,
      price: { numerator: '2', denominator: '3' },
    });
    expect(result.boundary).toMatchObject({ timestampMs: H, confirmedAtMs: f.slot.timing.boundaryConfirmedAtMs });
    expect(result.selectionVerified).toBe(false);
    expect(result.historicalBrowserArrivalVerified).toBe(false);
    expect(result.scheduleCompletenessVerified).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(Object.isFrozen(result.mark.price)).toBe(true);
    expect(isVerifiedAccumulationNativeMark(clone(result))).toBe(false);
    f.raw.target.hash = nativeMarkHash(50);
    expect((result.retainedEvidence as typeof f.raw).target.hash).toBe(nativeMarkHash(100));
  });
  it.each(['opening', 'terminal'] as const)('accepts exact-H successor but rejects exact-H target for %s', (role) => {
    const f = fixture(role);
    expect(verify(f).boundary?.timestampMs).toBe(H);
    setTargetTime(f, H);
    expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
  });
  it('keeps later opening confirmation separate and refuses to refresh the original receipt', () => {
    const f = fixture();
    expect(verify(f).mark.receivedAtMs).toBeLessThan(H);
    f.slot.timing.contextReceivedAtMs = f.slot.timing.boundaryConfirmedAtMs!;
    expect(() => verify(f)).toThrow(/observed-context-clock/);
  });
  it('accepts explicit modeled timing without relabeling later acquisition as historical arrival', () => {
    const f = fixture('opening', 'historical-modeled'),
      result = verify(f);
    expect(result.timingMode).toBe('historical-modeled');
    expect(result.mark.receivedAtMs).toBeLessThan(f.raw.contextRpc[0].requestedAtMs);
    expect(result.registeredSlot.timing.scenarioId).toBe('synthetic-arrival-scenario');
    f.slot.timing.mode = 'observed-receipts';
    f.slot.timing.scenarioId = null;
    expect(() => verify(f)).toThrow(/observed-context-clock/);
  });
  it.each(['opening', 'terminal', 'risk'] as const)('rejects missing source or clock binding for %s', (role) => {
    const f = fixture(role);
    f.slot.timing.receiptBindingSha256 = 'e'.repeat(64);
    expect(() => verify(f)).toThrow(/timing-receipt-binding/);
    repin(f);
    f.trusted.rawSha256 = 'e'.repeat(64);
    expect(() => verify(f)).toThrow(/trusted-raw-or-source/);
  });
  it('requires scenario identity only for modeled timing', () => {
    const f = fixture('opening', 'historical-modeled');
    f.slot.timing.scenarioId = null;
    expect(() => verify(f)).toThrow(/timing-scenario/);
    const observed = fixture();
    observed.slot.timing.scenarioId = 'forged';
    expect(() => verify(observed)).toThrow(/timing-scenario/);
  });
  it('preserves reducer semantics for risk marks older than 5s but within 60s', () => {
    const f = fixture('risk', 'historical-modeled');
    setTargetTime(f, H - 60000);
    f.slot.timing.contextReceivedAtMs = H - 30000;
    expect(verify(f).mark.receivedAtMs).toBe(H - 30000);
    setTargetTime(f, H - 60001);
    expect(() => verify(f)).toThrow(/risk-clock/);
  });
  it('provides one original timeline with advancing synthetic heights for journal composition', () => {
    const rows = [
      fixture('opening', 'observed-receipts', { openingAtMs: H, controlAtMs: H, targetHeight: 100 }),
      fixture('risk', 'observed-receipts', { openingAtMs: H, controlAtMs: H + 3600000, targetHeight: 200 }),
      fixture('terminal', 'observed-receipts', { openingAtMs: H, controlAtMs: H + 86400000, targetHeight: 300 }),
    ].map((f) => verify(f));
    expect(rows.map((r) => r.mark.blockNumber)).toEqual([100, 200, 300]);
    expect(rows.every((r) => r.registeredSlot.openingAtMs === H && r.registeredSlot.deadlineMs === H + 86400000)).toBe(
      true
    );
  });
  it('requires the original opening to be exactly on a UTC hour', () => {
    const f = fixture();
    f.slot.openingAtMs += 1;
    f.slot.deadlineMs += 1;
    f.slot.controlAtMs += 1;
    expect(() => verify(f)).toThrow(/opening-hour-alignment/);
  });
  it('rejects future risk receipt, deadline risk and boundary payload for risk', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => {
        f.slot.timing.contextReceivedAtMs = H + 1;
      },
      (f: ReturnType<typeof fixture>) => {
        f.slot.controlAtMs = f.slot.deadlineMs;
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.boundaryRpc = [];
      },
    ]) {
      const f = fixture('risk', 'historical-modeled');
      mutate(f);
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
  });
  it('enforces opening freshness and terminal retrospective receipt without imposing a terminal arrival deadline', () => {
    const open = fixture('opening', 'historical-modeled');
    setTargetTime(open, H - 6000);
    open.slot.timing.contextReceivedAtMs = H - 5000;
    expect(() => verify(open)).toThrow(/opening-original-clock/);
    const terminal = fixture('terminal', 'historical-modeled');
    terminal.slot.timing.contextReceivedAtMs = H - 1;
    expect(() => verify(terminal)).toThrow(/terminal-retrospective-clock/);
    terminal.slot.timing.contextReceivedAtMs = H + 100000;
    terminal.slot.timing.boundaryConfirmedAtMs = H + 110000;
    expect(verify(terminal).mark.receivedAtMs).toBe(H + 100000);
  });
  it('rejects backdated successor confirmation and incomplete boundary', () => {
    const f = fixture('opening', 'historical-modeled');
    f.slot.timing.boundaryConfirmedAtMs = H - 1;
    expect(() => verify(f)).toThrow(/boundary-confirmation-clock/);
    const missing = fixture();
    missing.raw.boundaryRpc = null;
    repin(missing);
    expect(() => verify(missing)).toThrow(/boundary-required/);
  });
  it('rejects successor link, timestamp, runtime and code substitutions', () => {
    const changes: [number, (v: Json) => void][] = [
      [
        6,
        (v) => {
          v.result.parentHash = nativeMarkHash(77);
        },
      ],
      [
        6,
        (v) => {
          v.result.number = '0x66';
        },
      ],
      [
        7,
        (v) => {
          v.result.specVersion++;
        },
      ],
      [
        9,
        (v) => {
          v.result = nativeMarkHash(999);
        },
      ],
      [
        10,
        (v) => {
          v.result[0].changes[0][1] = hex(le(H - 1, 8));
        },
      ],
      [
        10,
        (v) => {
          v.result[0].changes[0][0] = '0x11';
        },
      ],
      [
        10,
        (v) => {
          v.result[0].changes[0][1] += '00';
        },
      ],
      [
        10,
        (v) => {
          v.result[0].block = nativeMarkHash(99);
        },
      ],
    ];
    for (const [index, edit] of changes) {
      const f = fixture();
      response(f.raw.boundaryRpc![index], edit);
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
  });
  it('rejects unsupported or changed parent metadata/runtime/code', () => {
    for (const index of [12, 13, 14]) {
      const f = fixture();
      response(f.raw.contextRpc[index], (v) => {
        if (index === 12) v.result.transactionVersion++;
        else v.result = '0x00';
      });
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
  });
  it('rejects noncanonical genesis, target, final anchor and unfinalized successor', () => {
    for (const index of [0, 1, 5, 7]) {
      const f = fixture();
      response(f.raw.contextRpc[index], (v) => {
        v.result = nativeMarkHash(77);
      });
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
    const f = fixture();
    f.trusted.boundaryFinalizedSource!.height = 100;
    expect(() => verify(f)).toThrow(/height-after-trusted-finality/);
  });
  it('rejects missing, duplicate, mixed-state and unexpected storage values', () => {
    const changes = [
      (v: Json) => {
        v.result[0].changes.pop();
      },
      (v: Json) => {
        v.result[0].changes[1] = v.result[0].changes[0];
      },
      (v: Json) => {
        v.result[0].block = nativeMarkHash(99);
      },
      (v: Json) => {
        v.result.push(v.result[0]);
      },
    ];
    for (const edit of changes) {
      const f = fixture();
      response(f.raw.contextRpc.at(-1)!, edit);
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
  });
  it('does not substitute absent/zero pools, denomination or token identities', () => {
    for (const [label, value] of [
      ['properties', null],
      ['reserves', null],
      ['reserves', hex(Buffer.alloc(32))],
      ['denominator', hex(le(2n))],
      ['kusd', '0x00'],
    ] as const) {
      const f = fixture();
      response(f.raw.contextRpc.at(-1)!, (v) => {
        v.result[0].changes.find((c: string[]) => c[0] === f.keys[label])[1] = value;
      });
      repin(f);
      try {
        verify(f);
        throw Error('unexpected success');
      } catch (error) {
        expect(error).toBeInstanceOf(AccumulationNativeMarkError);
        expect((error as AccumulationNativeMarkError).status).toBe('incomplete');
        expect(isVerifiedAccumulationNativeMark(error)).toBe(false);
      }
    }
  });
  it('rejects transport failures, redirects, changed byte digests, duplicate IDs and extra records', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[0].httpStatus = 302;
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[0].failure = 'timeout';
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[0].responseSha256 = 'e'.repeat(64);
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[1].requestBody = f.raw.contextRpc[0].requestBody;
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc.push(f.raw.contextRpc[0]);
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[0].endpoint = 'https://example.com/';
      },
      (f: ReturnType<typeof fixture>) => {
        f.raw.contextRpc[1].requestedAtMs--;
      },
    ];
    for (const edit of changes) {
      const f = fixture();
      edit(f);
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationNativeMarkError);
    }
  });
  it('rejects duplicate JSON keys, inexact numeric IDs, accessors and unbounded input', () => {
    const f = fixture(),
      r = f.raw.contextRpc[0];
    r.responseBody = r.responseBody!.replace('"jsonrpc":"2.0"', '"jsonrpc":"2.0","jsonrpc":"2.0"');
    r.responseSha256 = nativeMarkSha(r.responseBody);
    repin(f);
    expect(() => verify(f)).toThrow(/duplicate-json-key/);
    const numeric = fixture();
    numeric.raw.contextRpc[0].requestBody = numeric.raw.contextRpc[0].requestBody.replace('"id":1', '"id":1.0');
    repin(numeric);
    expect(() => verify(numeric)).toThrow(/inexact-json-number/);
    const getter = vi.fn();
    const bad = { ...fixture().raw };
    Object.defineProperty(bad, 'target', { enumerable: true, get: getter });
    expect(() => verifyAccumulationNativeMark(bad, f.trusted, f.slot)).toThrow(/accessor/);
    expect(getter).not.toHaveBeenCalled();
    const huge = fixture();
    huge.raw.contextRpc[0].responseBody = 'x'.repeat(17 * 1024 * 1024);
    expect(() => verify(huge)).toThrow(/evidence-bytes/);
  });
});
