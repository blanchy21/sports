/**
 * Shared Prisma client mock for prediction tests.
 *
 * Provides FakeDecimal (mimics Prisma.Decimal arithmetic) and PredictionStatus enum
 * so tests don't require Prisma codegen.
 *
 * Mapped via jest.config.ts: '@/generated/prisma/client' → this file.
 */

export class FakeDecimal {
  private value: number;

  constructor(v: number | string | FakeDecimal) {
    this.value = v instanceof FakeDecimal ? v.value : Number(v);
  }

  add(other: FakeDecimal) {
    return new FakeDecimal(this.value + other.value);
  }

  minus(other: FakeDecimal) {
    return new FakeDecimal(this.value - other.value);
  }

  mul(other: FakeDecimal) {
    return new FakeDecimal(this.value * other.value);
  }

  div(other: FakeDecimal) {
    return new FakeDecimal(this.value / other.value);
  }

  gt(other: FakeDecimal) {
    return this.value > other.value;
  }

  isZero() {
    return this.value === 0;
  }

  toDecimalPlaces(places: number) {
    const factor = Math.pow(10, places);
    return new FakeDecimal(Math.round(this.value * factor) / factor);
  }

  toNumber() {
    return this.value;
  }
}

export const Prisma = { Decimal: FakeDecimal };

export const PredictionStatus = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  SETTLING: 'SETTLING',
  SETTLED: 'SETTLED',
  REFUNDED: 'REFUNDED',
  VOID: 'VOID',
} as const;
