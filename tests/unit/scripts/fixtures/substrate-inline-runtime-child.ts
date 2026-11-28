/** Load the real local SDK offline, with legacy package and checkout resolution forbidden. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const legacyDependency = /@sora-substrate\/|sora2?-substrate-js-library/;
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    assert.doesNotMatch(specifier, legacyDependency);
    const result = nextResolve(specifier, context);
    assert.doesNotMatch(result.url, legacyDependency);
    return result;
  },
});

/** Exercise all local module entry points without opening a provider or loading a wallet. */
async function main(): Promise<void> {
  const [sdk, math, liquidity, api, connection, types, definitions] = await Promise.all([
    import('@/lib/substrate/sdk'),
    import('@/lib/substrate/math'),
    import('@/lib/substrate/liquidity-proxy'),
    import('@/lib/substrate/api'),
    import('@/lib/substrate/connection'),
    import('@/lib/substrate/types'),
    import('@/lib/substrate/type-definitions'),
  ]);
  assert.equal(sdk.FPNumber, math.FPNumber);
  assert.equal(liquidity.Consts.MIN.toCodecString(), '1');
  assert.equal(liquidity.Consts.XOR, '0x0200000000000000000000000000000000000000000000000000000000000000');
  assert.equal(api.options().types?.Balance, 'u128');
  assert.equal(types.types, definitions.types);
  assert.ok(sdk.connection instanceof connection.Connection);
  assert.equal(sdk.connection.opened, false);
  assert.equal(typeof sdk.api.swap.getMinMaxValue, 'function');
  assert.equal(typeof sdk.api.poolXyk.add, 'function');

  process.stdout.write(
    JSON.stringify({
      amountCodec: math.FPNumber.fromNatural('1.234567890123456789').toCodecString(),
      sixDecimalCodec: math.FPNumber.fromNatural('1.234567', 6).toCodecString(),
      sharedMath: sdk.FPNumber === math.FPNumber,
      disconnected: !sdk.connection.opened,
      modules: ['sdk', 'math', 'liquidity-proxy', 'api', 'connection', 'types', 'type-definitions'],
    }) + '\n'
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => hook.deregister());
