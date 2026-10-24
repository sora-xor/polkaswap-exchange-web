/** Fresh-process probe for wallet schema initialization under a strict script CSP. */
import { pathToFileURL } from 'node:url';

let functionCalls = 0;
globalThis.Function = new Proxy(globalThis.Function, {
  apply() {
    functionCalls++;
    throw new EvalError('Dynamic Function construction is blocked by the test CSP');
  },
  construct() {
    functionCalls++;
    throw new EvalError('Dynamic Function construction is blocked by the test CSP');
  },
});

const { W3mFrameSchema } = await import(pathToFileURL(process.argv[2]).href);
const request = { type: '@w3m-app/RPC_REQUEST', payload: { method: 'eth_accounts' } };
const valid = W3mFrameSchema.appEvent.safeParse(request);
const validAsync = await W3mFrameSchema.appEvent.safeParseAsync(request);
const invalidRequest = {
  type: '@w3m-app/RPC_REQUEST',
  payload: { method: 'not-a-wallet-method' },
};
const invalid = W3mFrameSchema.appEvent.safeParse(invalidRequest);
const invalidAsync = await W3mFrameSchema.appEvent.safeParseAsync(invalidRequest);
const frame = W3mFrameSchema.frameEvent.safeParse({ type: '@w3m-frame/RPC_REQUEST_SUCCESS' });
process.stdout.write(
  JSON.stringify({
    functionCalls,
    valid: valid.success,
    validAsync: validAsync.success,
    invalid: invalid.success,
    invalidAsync: invalidAsync.success,
    frame: frame.success,
  })
);
