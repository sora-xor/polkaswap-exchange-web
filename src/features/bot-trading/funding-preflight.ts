/** Read-only funding arithmetic for the simple bot setup; no wallet or signing dependency. */
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec, fromCodec } from './amounts';
import type { BotAsset } from './types';

const MAX_CODEC = (1n << 128n) - 1n;

export interface BotFundingPreflightInput {
  inputAsset: BotAsset;
  /** Total input-token cap. When the input is XOR, this already includes the XOR fee reserve. */
  capitalCodec: string;
  feeReserveXorCodec: string;
  /** Fresh transferable balances. Live approval also accounts for other bot allocations. */
  availableCodecByAddress: Readonly<Record<string, string>>;
}

export interface BotFundingPreflightAsset {
  asset: BotAsset;
  availableCodec: string;
  requiredCodec: string;
  shortfallCodec: string;
  /** Exact natural-unit strings for display; never rounded through a JavaScript number. */
  available: string;
  required: string;
  shortfall: string;
}

export interface BotFundingPreflight {
  sufficient: boolean;
  assets: BotFundingPreflightAsset[];
}

/** Reject malformed or out-of-range chain amounts before exact integer comparison. */
function readAmount(value: unknown, error: 'amount' | 'balance'): bigint {
  try {
    if (typeof value !== 'string') throw Error();
    const parsed = codec(value);
    if (parsed > MAX_CODEC) throw Error();
    return parsed;
  } catch {
    throw new Error(`bots.errors.${error}`);
  }
}

/**
 * Compare the selected capital cap and XOR fee reserve with a fresh available-balance snapshot.
 * A missing balance is unknown, not zero. The caller must re-read balances before live approval.
 */
export function assessBotFundingPreflight(input: BotFundingPreflightInput): BotFundingPreflight {
  const { inputAsset, availableCodecByAddress } = input;
  if (
    !inputAsset ||
    typeof inputAsset.address !== 'string' ||
    !inputAsset.address ||
    typeof inputAsset.symbol !== 'string' ||
    !inputAsset.symbol ||
    !Number.isInteger(inputAsset.decimals) ||
    inputAsset.decimals < 0 ||
    inputAsset.decimals > 36 ||
    (inputAsset.address === XOR.address && inputAsset.decimals !== XOR.decimals)
  )
    throw new Error('bots.errors.amount');
  if (!availableCodecByAddress || typeof availableCodecByAddress !== 'object') throw new Error('bots.errors.balance');

  const capital = readAmount(input.capitalCodec, 'amount');
  const reserve = readAmount(input.feeReserveXorCodec, 'amount');
  const required =
    inputAsset.address === XOR.address
      ? [{ asset: inputAsset, codec: capital > reserve ? capital : reserve }]
      : [
          { asset: inputAsset, codec: capital },
          { asset: XOR, codec: reserve },
        ];

  const assets = required.map(({ asset, codec: needed }): BotFundingPreflightAsset => {
    const available = readAmount(
      Object.prototype.hasOwnProperty.call(availableCodecByAddress, asset.address)
        ? availableCodecByAddress[asset.address]
        : undefined,
      'balance'
    );
    const shortfall = needed > available ? needed - available : 0n;
    return {
      asset: { ...asset },
      availableCodec: available.toString(),
      requiredCodec: needed.toString(),
      shortfallCodec: shortfall.toString(),
      available: fromCodec(available.toString(), asset.decimals),
      required: fromCodec(needed.toString(), asset.decimals),
      shortfall: fromCodec(shortfall.toString(), asset.decimals),
    };
  });
  return { sufficient: assets.every((asset) => asset.shortfallCodec === '0'), assets };
}
