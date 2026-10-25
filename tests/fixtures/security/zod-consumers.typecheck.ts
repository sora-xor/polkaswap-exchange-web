/** Compile-only regression for the regenerated public Zod 4 consumer declarations. */
import { CreatePolicyBodySchema, type CreatePolicyBody } from '@coinbase/cdp-sdk';
import { W3mFrameSchema, type W3mFrameTypes } from '@reown/appkit-wallet';

const policy: CreatePolicyBody = {
  scope: 'account',
  rules: [
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [{ type: 'ethValue', operator: '<=', ethValue: '100' }],
    },
  ],
};
const validatedPolicy: CreatePolicyBody = CreatePolicyBodySchema.parse(policy);
const event: W3mFrameTypes.AppEvent = W3mFrameSchema.appEvent.parse({
  type: '@w3m-app/RPC_REQUEST',
  payload: { method: 'eth_accounts' },
});
if (event.type === '@w3m-app/RPC_REQUEST') {
  const method: string = event.payload.method;
  void method;
}

// @ts-expect-error The migrated declaration must retain the scope discriminator.
const invalidScope: CreatePolicyBody['scope'] = 'unknown-scope';
// @ts-expect-error The migrated declaration must retain the wallet-event discriminator.
const invalidEventType: W3mFrameTypes.AppEvent['type'] = '@w3m-app/UNKNOWN';
type EvmTransactionRule = Extract<CreatePolicyBody['rules'][number], { operation: 'signEvmTransaction' }>;
type EvmDataCriterion = Extract<EvmTransactionRule['criteria'][number], { type: 'evmData' }>;
const abiCriterion: EvmDataCriterion = {
  type: 'evmData',
  abi: [
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ],
  conditions: [{ function: 'balanceOf' }],
};
type CustomAbi = Exclude<EvmDataCriterion['abi'], string>;
type AbiFunction = Extract<CustomAbi[number], { type: 'function' }>;
// @ts-expect-error The imported ABI declaration must retain its parameter type.
const invalidAbi: AbiFunction['inputs'][number]['type'] = 123;
void validatedPolicy;
void invalidScope;
void invalidEventType;
void abiCriterion;
void invalidAbi;
