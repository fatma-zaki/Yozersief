/**
 * Money is numeric(12,2) in Postgres and a string in TS (brief A5).
 * Arithmetic happens on integer piasters (bigint) so there is no float drift.
 */
export type Money = string;

const MONEY_REGEX = /^-?\d+(\.\d{1,2})?$/;

export function isMoney(value: string): value is Money {
  return MONEY_REGEX.test(value);
}

export function toPiasters(value: Money): bigint {
  if (!isMoney(value)) throw new RangeError(`invalid money value: ${value}`);
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const piasters = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -piasters : piasters;
}

export function fromPiasters(piasters: bigint): Money {
  const negative = piasters < 0n;
  const abs = negative ? -piasters : piasters;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function addMoney(...values: Money[]): Money {
  return fromPiasters(values.reduce((sum, v) => sum + toPiasters(v), 0n));
}

export function subtractMoney(a: Money, b: Money): Money {
  return fromPiasters(toPiasters(a) - toPiasters(b));
}

export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) throw new RangeError("quantity must be an integer");
  return fromPiasters(toPiasters(value) * BigInt(quantity));
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  const diff = toPiasters(a) - toPiasters(b);
  return diff === 0n ? 0 : diff < 0n ? -1 : 1;
}
