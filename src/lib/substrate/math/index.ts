import BigNumber from 'bignumber.js';
import isNil from 'lodash/fp/isNil';
import type { AnyJson, Codec } from '@polkadot/types/types';

/**
 * Use just to highlight the visual difference across the "string" itself.
 * It's just impossible to specify the type
 */
export type CodecString = string; // NOSONAR
export type NumberLike = number | string;

BigNumber.config({
  FORMAT: {
    decimalSeparator: '.',
    groupSeparator: '',
    fractionGroupSeparator: '',
  },
});

type OperatorParam = string | number | BigNumber;
type OperatorParamFull = FPNumber | string | number | BigNumber;
type NumberType = Codec | FPNumber | string | number | BigNumber | bigint;

const isFinityString = (str: string) => !['-Infinity', 'Infinity', 'NaN'].includes(str);
const isZeroString = (str: string) => str === '0' || str === '-0';

export class FPNumber {
  /**
   * Numbers' delimiters config. Might be edited to support different locales
   */
  // prettier-ignore
  public static DELIMITERS_CONFIG = { // NOSONAR
    thousand: ',',
    decimal: '.',
  };

  /**
   * The default precision used in mathematical calculations.
   * @default 18
   */
  public static DEFAULT_PRECISION = 18; // NOSONAR

  /**
   * The default number of decimal places used in calculations. Might be modified
   *
   * @default 7
   */
  public static DEFAULT_DECIMAL_PLACES = 7; // NOSONAR

  /**
   * The default rounding mode used by the BigNumber class.
   * @default 3
   *
   * @remarks
   * The value of this property represents the rounding mode used when performing arithmetic operations with BigNumber instances.
   *
   * `0` Rounds away from zero
   * `1` Rounds towards zero
   * `2` Rounds towards Infinity
   * `3` Rounds towards -Infinity
   * `4` Rounds towards nearest neighbour. If equidistant, rounds away from zero
   * `5` Rounds towards nearest neighbour. If equidistant, rounds towards zero
   * `6` Rounds towards nearest neighbour. If equidistant, rounds towards even neighbour
   * `7` Rounds towards nearest neighbour. If equidistant, rounds towards Infinity
   * `8` Rounds towards nearest neighbour. If equidistant, rounds towards -Infinity
   */
  public static DEFAULT_ROUND_MODE: BigNumber.RoundingMode = 3; // NOSONAR

  /** Zero value (0) */
  public static readonly ZERO = FPNumber.fromNatural(0);
  /** One value (1) */
  public static readonly ONE = FPNumber.fromNatural(1);
  /** Two value (2) */
  public static readonly TWO = FPNumber.fromNatural(2);
  /** Three value (3) */
  public static readonly THREE = FPNumber.fromNatural(3);
  /** Four value (4) */
  public static readonly FOUR = FPNumber.fromNatural(4);
  /** Five value (5) */
  public static readonly FIVE = FPNumber.fromNatural(5);
  /** Ten value (10) */
  public static readonly TEN = FPNumber.fromNatural(10);
  /** Hundred value (100) */
  public static readonly HUNDRED = FPNumber.fromNatural(100);
  /** Thousand value (1_000) */
  public static readonly THOUSAND = FPNumber.fromNatural(1000);
  /** Ten thousands value (10_000) */
  public static readonly TEN_THOUSANDS = FPNumber.fromNatural(10_000);
  /**
   * Returns the maximum value from the given array of `FPNumber` instances.
   * If the array is empty or `null`, it returns `null`.
   * @param numbers - An array of `FPNumber` instances.
   * @returns The maximum value from the array or `null` if the array is empty or `null`.
   */
  public static max(...numbers: Array<FPNumber>): FPNumber;
  public static max(...numbers: []): null;
  public static max(...numbers: Array<FPNumber>): FPNumber | null {
    if (!numbers?.length) {
      return null;
    }
    const precision = numbers[0].precision;
    const filtered = numbers.map((item) => item.value);
    return new FPNumber(BigNumber.max(...filtered), precision);
  }

  /**
   * Returns the minimum value from the given array of `FPNumber` instances.
   * If the array is empty or `null`, it returns `null`.
   * @param numbers An array of `FPNumber` instances.
   * @returns The minimum value from the array as an `FPNumber` instance, or `null` if the array is empty or `null`.
   */
  public static min(...numbers: Array<FPNumber>): FPNumber;
  public static min(...numbers: []): null;
  public static min(...numbers: Array<FPNumber>): FPNumber | null {
    if (!numbers?.length) {
      return null;
    }
    const precision = numbers[0].precision;
    const filtered = numbers.map((item) => item.value);
    return new FPNumber(BigNumber.min(...filtered), precision);
  }

  /**
   * Checks if the first `FPNumber` is less than the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is less than the second `FPNumber`, `false` otherwise.
   */
  public static lt(first: FPNumber, second: FPNumber): boolean {
    return first.value.lt(second.value);
  }

  /**
   * Checks if the first `FPNumber` is less than the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is less than the second `FPNumber`, `false` otherwise.
   */
  public static readonly isLessThan = FPNumber.lt;

  /**
   * Checks if the value of the first `FPNumber` is less than or equal to the value of the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the value of the first `FPNumber` is less than or equal to the value of the second `FPNumber`, `false` otherwise.
   */
  public static lte(first: FPNumber, second: FPNumber): boolean {
    return first.value.lte(second.value);
  }

  /**
   * Checks if the value of the first `FPNumber` is less than or equal to the value of the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the value of the first `FPNumber` is less than or equal to the value of the second `FPNumber`, `false` otherwise.
   */
  public static readonly isLessThanOrEqualTo = FPNumber.lte;

  /**
   * Checks if the first `FPNumber` is greater than the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is greater than the second `FPNumber`, `false` otherwise.
   */
  public static gt(first: FPNumber, second: FPNumber): boolean {
    return first.value.gt(second.value);
  }

  /**
   * Checks if the first `FPNumber` is greater than the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is greater than the second `FPNumber`, `false` otherwise.
   */
  public static readonly isGreaterThan = FPNumber.gt;

  /**
   * Checks if the first `FPNumber` is greater than or equal to the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is greater than or equal to the second `FPNumber`, `false` otherwise.
   */
  public static gte(first: FPNumber, second: FPNumber): boolean {
    return first.value.gte(second.value);
  }

  /**
   * Checks if the first `FPNumber` is greater than or equal to the second `FPNumber`.
   * @param first - The first `FPNumber` to compare.
   * @param second - The second `FPNumber` to compare.
   * @returns `true` if the first `FPNumber` is greater than or equal to the second `FPNumber`, `false` otherwise.
   */
  public static readonly isGreaterThanOrEqualTo = FPNumber.gte;

  /**
   * Checks if two `FPNumber` instances are equal.
   * @param first - The first `FPNumber` instance.
   * @param second - The second `FPNumber` instance.
   * @returns `true` if the two `FPNumber` instances are equal, `false` otherwise.
   */
  public static eq(first: FPNumber, second: FPNumber): boolean {
    return first.value.eq(second.value);
  }

  /**
   * Checks if two `FPNumber` instances are equal.
   * @param first - The first `FPNumber` instance.
   * @param second - The second `FPNumber` instance.
   * @returns `true` if the two `FPNumber` instances are equal, `false` otherwise.
   */
  public static readonly isEqualTo = FPNumber.eq;

  /**
   * Creates a new `FPNumber` instance from a natural number.
   *
   * @param value - The value of the natural number.
   * @param precision - The precision of the `FPNumber` instance (default: `FPNumber.DEFAULT_PRECISION`).
   * @returns A new `FPNumber` instance representing the natural number.
   */
  public static fromNatural(value: number | string, precision: number = FPNumber.DEFAULT_PRECISION): FPNumber {
    return new FPNumber(value, precision);
  }

  /**
   * Creates an instance of `FPNumber` from a codec value.
   *
   * @param value - `(value * 10^precision)` to create the `FPNumber` from. It can be a number,
   * string, or bigint represented by `(value * 10^precision)`.
   * @param precision - The precision to use for the `FPNumber`. Defaults to `FPNumber.DEFAULT_PRECISION`.
   * @returns An instance of `FPNumber` created from the given value.
   */
  public static fromCodecValue(
    value: number | string | bigint,
    precision: number = FPNumber.DEFAULT_PRECISION
  ): FPNumber {
    let filtered: number | string;
    switch (typeof value) {
      case 'string':
        filtered = value.replace(/[,. ]/g, '');
        break;
      case 'bigint':
        filtered = value.toString();
        break;
      default:
        filtered = value;
        break;
    }

    const bn = new BigNumber(filtered || 0);
    return new FPNumber(bn.div(10 ** precision), precision);
  }

  public readonly value: BigNumber;

  private formatInitialDataString(data: string): string | number {
    if (!data) return '0'; // backward compatibility with +'' === 0

    if (!isFinityString(data)) return data; // '-Infinity', 'Infinity', 'NaN'

    if (isZeroString(data)) return '0';

    const withoutFormatting = data.replace(/[, ]/g, '');

    if (withoutFormatting.includes('e')) {
      return +withoutFormatting; // For numbers with epsilon 1.123e+3 -> 1123
    }

    const [integer, fractional] = withoutFormatting.split('.') as [string, string | undefined];

    if (!(integer && Number.isFinite(+integer)) || (fractional && !Number.isFinite(+fractional))) {
      return 'NaN';
    }

    return `${integer ?? 0}.${fractional ?? 0}`;
  }

  private formatInitialDataCodec(data: Codec, precision: number): BigNumber {
    const json = data.toJSON() as (AnyJson & { balance: string }) | null;
    // `BalanceInfo` or `Balance` check
    const str = json && !isNil(json.balance) ? `${json.balance}`.replace(/[,. ]/g, '') : data.toString();
    return new BigNumber(str).div(10 ** precision);
  }

  private formatInitialData(data: string | number | Codec | bigint, precision: number): OperatorParam {
    if (isNil(data)) {
      console.warn('[FPNumber] formatInitialData: data is nil -> return "0"');
      return 0;
    }
    switch (typeof data) {
      case 'number':
        return data;
      case 'string':
        return this.formatInitialDataString(data);
      case 'bigint':
        return this.formatInitialDataString(data.toString());
    }
    if ('toString' in data) {
      return this.formatInitialDataCodec(data, precision);
    }
    return 0;
  }

  /**
   * Supports `data` as `string`, `number`, `BigNumber`, `FPNumber`, `BigInt` and `Codec` data types.
   * It's better not to use `number` parameter as data if you want the strict rules for rounding
   * @param data
   * @param precision
   */
  constructor(
    data: NumberType,
    public precision = FPNumber.DEFAULT_PRECISION
  ) {
    let value: BigNumber;
    if (data instanceof BigNumber) {
      value = data;
    } else if (data instanceof FPNumber) {
      value = data.value;
      this.precision = data.precision;
    } else {
      const initialData = this.formatInitialData(data, precision);
      value = initialData instanceof BigNumber ? initialData : new BigNumber(initialData);
    }
    this.value = value.dp(this.precision, 1); // `1` Rounds towards zero
  }

  /**
   * Gets the codec value as a string.
   * The codec value is calculated by multiplying the `value` property by 10 raised to the power of `precision`,
   * and then formatting the result as a string with no decimal places.
   * @returns The codec value as a string.
   */
  get codec(): string {
    return this.value.times(10 ** this.precision).toFormat(0);
  }

  /**
   * Gets the codec value as a string.
   * The codec value is calculated by multiplying the `value` property by 10 raised to the power of `precision`,
   * and then formatting the result as a string with no decimal places.
   * @returns The codec value as a string.
   */
  public toCodecString(): string {
    return this.codec;
  }

  /**
   * Converts the `codec` property of the `FPNumber` instance to a `BigInt`.
   * If the conversion fails, it returns `BigInt(0)` and logs a warning message.
   * @returns The `BigInt` representation of the `codec` property.
   */
  public toCodecBigInt(): BigInt {
    try {
      return BigInt(this.codec);
    } catch (error) {
      console.warn(`[FPNumber] FPNumber.toCodecBigInt: convert "${this.codec}" to BigInt error -> return "0"`, error);
      return BigInt(0);
    }
  }

  /**
   * Formats the value of the BigNumber instance as a string.
   * @param dp - The number of decimal places to round the value to. Defaults to `FPNumber.DEFAULT_DECIMAL_PLACES`.
   * @param format - The format to use for formatting the value. Optional.
   * @param preserveOrder - Specifies whether to preserve the order of the formatted value. Defaults to `false`.
   * @returns The formatted value as a string.
   */
  public format(dp = FPNumber.DEFAULT_DECIMAL_PLACES, format?: BigNumber.Format, preserveOrder = false): string {
    const value = this.value;
    if (value.isZero()) {
      if (format) {
        return preserveOrder ? value.toFormat(dp, format) : value.toFormat(format);
      }
      return value.toFormat();
    }
    let formatted = value.dp(dp, FPNumber.DEFAULT_ROUND_MODE);
    if (formatted.isZero()) {
      // First significant character
      formatted = new BigNumber(value.toFormat().replace(/(0\.0*[1-9])(\d*)/, '$1'));
    }
    if (format) {
      return preserveOrder ? formatted.toFormat(dp, format) : formatted.toFormat(format);
    }
    return formatted.toFormat();
  }

  /**
   * Converts the number to a localized string representation.
   * @param dp - The number of decimal places to include in the string. Defaults to `FPNumber.DEFAULT_DECIMAL_PLACES`.
   * @param preserveOrder - Specifies whether to preserve the order of the number. Defaults to `false`.
   * @returns A string representation of the number in the localized format.
   */
  public toLocaleString(dp = FPNumber.DEFAULT_DECIMAL_PLACES, preserveOrder = false): string {
    let [integer, decimal] = this.format(
      dp,
      {
        groupSize: 3,
        groupSeparator: FPNumber.DELIMITERS_CONFIG.thousand,
        decimalSeparator: FPNumber.DELIMITERS_CONFIG.decimal,
      },
      preserveOrder
    ).split(FPNumber.DELIMITERS_CONFIG.decimal);

    return decimal ? integer.concat(FPNumber.DELIMITERS_CONFIG.decimal, decimal) : integer;
  }

  /**
   * Returns a string representation of the value.
   * @returns A string representation of the value.
   */
  public toString(): string {
    return this.value.toFormat();
  }

  /**
   * Returns a string representation of the number with a fixed number of decimal places.
   * @param dp The number of decimal places to round to. Defaults to 4.
   * @returns A string representation of the number with the specified number of decimal places.
   */
  public toFixed(dp: number = 4): string {
    return this.value.toFixed(dp, FPNumber.DEFAULT_ROUND_MODE);
  }

  /**
   * Converts the value of the `FPNumber` instance to a JavaScript number.
   * @param dp The number of decimal places to round the value to. Defaults to `FPNumber.DEFAULT_DECIMAL_PLACES`.
   * @returns The value of the `FPNumber` instance as a JavaScript number.
   */
  public toNumber(dp: number = FPNumber.DEFAULT_DECIMAL_PLACES): number {
    const result = this.value.dp(dp, FPNumber.DEFAULT_ROUND_MODE);
    return result.toNumber();
  }

  /**
   * Converts the current FPNumber instance to a BigInt.
   * If the conversion fails, it returns `BigInt(0)` and logs a warning message.
   * @param dp The number of decimal places to round the value to. Defaults to `FPNumber.DEFAULT_DECIMAL_PLACES`.
   * @returns The BigInt representation of the current FPNumber instance.
   */
  public toBigInt(dp: number = FPNumber.DEFAULT_DECIMAL_PLACES): bigint {
    const result = this.value.dp(dp, FPNumber.DEFAULT_ROUND_MODE).toString();
    try {
      return BigInt(result);
    } catch (error) {
      console.warn(`[FPNumber] FPNumber.toBigInt: convert "${result}" to BigInt error -> return "0"`, error);
      return BigInt(0);
    }
  }

  /**
   * Returns a new `FPNumber` instance with the specified number of decimal places.
   * @param {number} [dp=precision] Decimal places
   * @param {number} [roundMode=FPNumber.DEFAULT_ROUND_MODE] Decimal places
   * `0` Rounds away from zero
   * `1` Rounds towards zero
   * `2` Rounds towards Infinity
   * `3` Rounds towards -Infinity
   * `4` Rounds towards nearest neighbour. If equidistant, rounds away from zero
   * `5` Rounds towards nearest neighbour. If equidistant, rounds towards zero
   * `6` Rounds towards nearest neighbour. If equidistant, rounds towards even neighbour
   * `7` Rounds towards nearest neighbour. If equidistant, rounds towards Infinity
   * `8` Rounds towards nearest neighbour. If equidistant, rounds towards -Infinity
   */
  public dp(dp: number = this.precision, roundMode: BigNumber.RoundingMode = FPNumber.DEFAULT_ROUND_MODE): FPNumber {
    const newValue = this.value.dp(dp, roundMode);
    return new FPNumber(newValue, dp);
  }

  /**
   * Addition (+) operator
   * @param {FPNumber} target Target number
   */
  public add(target: FPNumber): FPNumber;
  /**
   * Addition (+) operator
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public add(target: OperatorParam): FPNumber;
  public add(target: OperatorParamFull): FPNumber {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.plus(value), this.precision);
  }

  /**
   * Subtraction (-) operator
   * @param {FPNumber} target Target number
   */
  public sub(target: FPNumber): FPNumber;
  /**
   * Subtraction (-) operator
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public sub(target: OperatorParam): FPNumber;
  public sub(target: OperatorParamFull): FPNumber {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.minus(value), this.precision);
  }

  /**
   * Multiplication (*) operator
   * @param {FPNumber} target Target number
   */
  public mul(target: FPNumber): FPNumber;
  /**
   * Multiplication (*) operator
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public mul(target: OperatorParam): FPNumber;
  public mul(target: OperatorParamFull): FPNumber {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.times(value), this.precision);
  }

  /**
   * Div (/) operator
   * @param {FPNumber} target Target number
   */
  public div(target: FPNumber): FPNumber;
  /**
   * Div (/) operator
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public div(target: OperatorParam): FPNumber;
  public div(target: OperatorParamFull): FPNumber {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.div(value), this.precision);
  }

  /**
   * Mod (%) operator
   * @param {FPNumber} target Target number
   */
  public mod(target: FPNumber): FPNumber;
  /**
   * Mod (%) operator
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public mod(target: OperatorParam): FPNumber;
  public mod(target: OperatorParamFull): FPNumber {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.mod(value), this.precision);
  }

  /**
   * Returns `true` if mod operation returns zero.
   *
   * For instance, 4 % 2 = 0, so it returns `true` in this case.
   *
   * @param {FPNumber} target Target number
   */
  public isZeroMod(target: FPNumber): boolean;
  /**
   * Returns `true` if mod operation returns zero.
   *
   * For instance, 4 % 2 = 0, so it returns `true` in this case.
   *
   * @param {string | number | BigNumber} target Target number, might be represented by 'string', 'number' or 'BigNumber' type
   */
  public isZeroMod(target: OperatorParam): boolean;
  public isZeroMod(target: OperatorParamFull): boolean {
    const value = target instanceof FPNumber ? target.value : target;
    return new FPNumber(this.value.mod(value), this.precision).isZero();
  }

  /**
   * Return the nagetive number
   */
  public negative(): FPNumber {
    return new FPNumber(this.value.negated());
  }

  /**
   * Return the absolute number
   */
  public abs(): FPNumber {
    return new FPNumber(this.value.abs());
  }

  /**
   * Return the sqrt number
   */
  public sqrt(): FPNumber {
    return new FPNumber(this.value.sqrt(), this.precision);
  }

  /**
   * Pow (**) operator
   * @param {FPNumber} exp Exponent number
   */
  public pow(exp: FPNumber): FPNumber;
  /**
   * Pow (**) operator
   * @param {string | number | BigNumber} exp Exponent number represented by 'string', 'number' or 'BigNumber' type
   */
  public pow(exp: OperatorParam): FPNumber;
  public pow(exp: OperatorParamFull): FPNumber {
    const value = exp instanceof FPNumber ? exp.value : exp;
    const numValue = value instanceof BigNumber ? value.toNumber() : +value;
    // BigNumber.pow works really slow so Math.pow should be used here
    // value.toNumber() is used to keep the value as is
    return new FPNumber(Math.pow(this.value.toNumber(), numValue), this.precision);
  }

  /**
   * Checks if the value of this object is NaN (not a number).
   * @returns {boolean} True if the value is NaN, false otherwise.
   */
  public isNaN(): boolean {
    return this.value.isNaN();
  }

  /**
   * Checks if the value of this object is a finite number.
   * @returns {boolean} Returns `true` if the value is finite, `false` otherwise (`NaN`, `-Infinity` or `Infinity`).
   */
  public isFinity(): boolean {
    return this.value.isFinite();
  }

  /**
   * Checks if the value of this object is zero.
   * @returns {boolean} True if the value is zero, false otherwise.
   */
  public isZero(): boolean {
    return this.value.isZero();
  }

  /**
   * Checks if the value is less than zero.
   * @returns {boolean} True if the value is less than zero, false otherwise.
   */
  public isLtZero(): boolean {
    return this.lt(FPNumber.ZERO);
  }

  /**
   * Checks if the value is less than or equal to zero.
   * @returns {boolean} True if the value is less than or equal to zero, false otherwise.
   */
  public isLteZero(): boolean {
    return this.lte(FPNumber.ZERO);
  }

  /**
   * Checks if the value is greater than zero.
   * @returns {boolean} True if the value is greater than zero, false otherwise.
   */
  public isGtZero(): boolean {
    return this.gt(FPNumber.ZERO);
  }

  /**
   * Checks if the value is greater than or equal to zero.
   * @returns {boolean} True if the value is greater than or equal to zero, false otherwise.
   */
  public isGteZero(): boolean {
    return this.gte(FPNumber.ZERO);
  }

  /**
   * Returns the maximum value among the given numbers.
   * @param numbers - An array of numbers to compare.
   * @returns The maximum value among the given numbers.
   */
  public max(...numbers: Array<FPNumber>): FPNumber {
    return FPNumber.max(this, ...numbers);
  }

  /**
   * Returns the minimum value among the given numbers.
   * @param numbers - The numbers to compare.
   * @returns The minimum value.
   */
  public min(...numbers: Array<FPNumber>): FPNumber {
    return FPNumber.min(this, ...numbers);
  }

  /**
   * Return `true` if this number is less than the number from param
   * @param {FPNumber} number Another number
   */
  public lt(number: FPNumber): boolean {
    return FPNumber.lt(this, number);
  }

  /**
   * Return `true` if this number is less than the number from param
   * @param {FPNumber} number Another number
   */
  public isLessThan = this.lt;

  /**
   * Return `true` if this number is less of equal than the number from param
   * @param {FPNumber} number Another number
   */
  public lte(number: FPNumber): boolean {
    return FPNumber.lte(this, number);
  }

  /**
   * Return `true` if this number is less of equal than the number from param
   * @param {FPNumber} number Another number
   */
  public isLessThanOrEqualTo = this.lte;

  /**
   * Return `true` if this number is greater than the number from param
   * @param {FPNumber} number Another number
   */
  public gt(number: FPNumber): boolean {
    return FPNumber.gt(this, number);
  }

  /**
   * Return `true` if this number is greater than the number from param
   * @param {FPNumber} number Another number
   */
  public isGreaterThan = this.gt;

  /**
   * Return `true` if this number is greater or equal than the number from param
   * @param {FPNumber} number Another number
   */
  public gte(number: FPNumber): boolean {
    return FPNumber.gte(this, number);
  }

  /**
   * Return `true` if this number is greater or equal than the number from param
   * @param {FPNumber} number Another number
   */
  public isGreaterThanOrEqualTo = this.gte;

  /**
   * Return `true` if values are equal
   * @param {FPNumber} number Another number
   */
  public eq(number: FPNumber): boolean {
    return FPNumber.eq(this, number);
  }

  /**
   * Return `true` if values are equal
   * @param {FPNumber} number Another number
   */
  public isEqualTo = this.eq;
}
