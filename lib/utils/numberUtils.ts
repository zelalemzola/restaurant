import Decimal from "decimal.js";

// Type alias for Decimal instances
type DecimalType = InstanceType<typeof Decimal>;

// Configure Decimal.js for financial precision
Decimal.config({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

export class PreciseNumber {
  private value: DecimalType;

  constructor(value: number | string | DecimalType) {
    this.value = new Decimal(value);
  }

  // Basic arithmetic operations
  add(other: number | string | DecimalType | PreciseNumber): PreciseNumber {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return new PreciseNumber(this.value.plus(otherValue));
  }

  subtract(
    other: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return new PreciseNumber(this.value.minus(otherValue));
  }

  multiply(
    other: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return new PreciseNumber(this.value.times(otherValue));
  }

  divide(other: number | string | DecimalType | PreciseNumber): PreciseNumber {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    if (otherValue.equals(0)) {
      throw new Error("Division by zero");
    }
    return new PreciseNumber(this.value.dividedBy(otherValue));
  }

  // Comparison operations
  equals(other: number | string | DecimalType | PreciseNumber): boolean {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return this.value.equals(otherValue);
  }

  greaterThan(other: number | string | DecimalType | PreciseNumber): boolean {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return this.value.greaterThan(otherValue);
  }

  lessThan(other: number | string | DecimalType | PreciseNumber): boolean {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return this.value.lessThan(otherValue);
  }

  greaterThanOrEqual(
    other: number | string | DecimalType | PreciseNumber
  ): boolean {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return this.value.greaterThanOrEqualTo(otherValue);
  }

  lessThanOrEqual(
    other: number | string | DecimalType | PreciseNumber
  ): boolean {
    const otherValue =
      other instanceof PreciseNumber ? other.value : new Decimal(other);
    return this.value.lessThanOrEqualTo(otherValue);
  }

  // Utility methods
  abs(): PreciseNumber {
    return new PreciseNumber(this.value.abs());
  }

  round(decimalPlaces: number = 2): PreciseNumber {
    return new PreciseNumber(this.value.toDecimalPlaces(decimalPlaces));
  }

  floor(): PreciseNumber {
    return new PreciseNumber(this.value.floor());
  }

  ceil(): PreciseNumber {
    return new PreciseNumber(this.value.ceil());
  }

  sqrt(): PreciseNumber {
    return new PreciseNumber(this.value.sqrt());
  }

  pow(exponent: number): PreciseNumber {
    return new PreciseNumber(this.value.pow(exponent));
  }

  // Conversion methods
  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toString();
  }

  toFixed(decimalPlaces: number = 2): string {
    return this.value.toFixed(decimalPlaces);
  }

  toPrecision(significantDigits: number): string {
    return this.value.toPrecision(significantDigits);
  }

  toExponential(decimalPlaces?: number): string {
    return this.value.toExponential(decimalPlaces);
  }

  getDecimal(): DecimalType {
    return this.value;
  }

  // Static factory methods
  static from(value: number | string | DecimalType): PreciseNumber {
    return new PreciseNumber(value);
  }

  static sum(
    ...values: (number | string | DecimalType | PreciseNumber)[]
  ): PreciseNumber {
    return values.reduce((sum: PreciseNumber, val) => {
      const current =
        val instanceof PreciseNumber ? val : new PreciseNumber(val);
      return sum.add(current);
    }, new PreciseNumber(0));
  }

  static average(
    ...values: (number | string | DecimalType | PreciseNumber)[]
  ): PreciseNumber {
    if (values.length === 0) {
      throw new Error("Cannot calculate average of empty array");
    }
    return PreciseNumber.sum(...values).divide(values.length);
  }

  static max(
    ...values: (number | string | DecimalType | PreciseNumber)[]
  ): PreciseNumber {
    if (values.length === 0) {
      throw new Error("Cannot find max of empty array");
    }

    return values.reduce(
      (max: PreciseNumber, val) => {
        const current =
          val instanceof PreciseNumber ? val : new PreciseNumber(val);
        return current.greaterThan(max) ? current : max;
      },
      values[0] instanceof PreciseNumber
        ? values[0]
        : new PreciseNumber(values[0])
    );
  }

  static min(
    ...values: (number | string | DecimalType | PreciseNumber)[]
  ): PreciseNumber {
    if (values.length === 0) {
      throw new Error("Cannot find min of empty array");
    }

    return values.reduce(
      (min: PreciseNumber, val) => {
        const current =
          val instanceof PreciseNumber ? val : new PreciseNumber(val);
        return current.lessThan(min) ? current : min;
      },
      values[0] instanceof PreciseNumber
        ? values[0]
        : new PreciseNumber(values[0])
    );
  }

  // Financial calculations
  static calculatePercentage(
    value: number | string | DecimalType | PreciseNumber,
    total: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const valueNum =
      value instanceof PreciseNumber ? value : new PreciseNumber(value);
    const totalNum =
      total instanceof PreciseNumber ? total : new PreciseNumber(total);

    if (totalNum.equals(0)) {
      return new PreciseNumber(0);
    }

    return valueNum.divide(totalNum).multiply(100);
  }

  static calculatePercentageChange(
    oldValue: number | string | DecimalType | PreciseNumber,
    newValue: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const oldNum =
      oldValue instanceof PreciseNumber
        ? oldValue
        : new PreciseNumber(oldValue);
    const newNum =
      newValue instanceof PreciseNumber
        ? newValue
        : new PreciseNumber(newValue);

    if (oldNum.equals(0)) {
      return new PreciseNumber(0);
    }

    return newNum.subtract(oldNum).divide(oldNum).multiply(100);
  }

  // Tax calculations
  static calculateTax(
    amount: number | string | DecimalType | PreciseNumber,
    taxRate: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const amountNum =
      amount instanceof PreciseNumber ? amount : new PreciseNumber(amount);
    const rateNum =
      taxRate instanceof PreciseNumber ? taxRate : new PreciseNumber(taxRate);

    return amountNum.multiply(rateNum).divide(100);
  }

  static addTax(
    amount: number | string | DecimalType | PreciseNumber,
    taxRate: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const amountNum =
      amount instanceof PreciseNumber ? amount : new PreciseNumber(amount);
    const tax = PreciseNumber.calculateTax(amount, taxRate);

    return amountNum.add(tax);
  }

  // Discount calculations
  static calculateDiscount(
    amount: number | string | DecimalType | PreciseNumber,
    discountRate: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const amountNum =
      amount instanceof PreciseNumber ? amount : new PreciseNumber(amount);
    const rateNum =
      discountRate instanceof PreciseNumber
        ? discountRate
        : new PreciseNumber(discountRate);

    return amountNum.multiply(rateNum).divide(100);
  }

  static applyDiscount(
    amount: number | string | DecimalType | PreciseNumber,
    discountRate: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const amountNum =
      amount instanceof PreciseNumber ? amount : new PreciseNumber(amount);
    const discount = PreciseNumber.calculateDiscount(amount, discountRate);

    return amountNum.subtract(discount);
  }

  // Margin calculations
  static calculateMargin(
    cost: number | string | DecimalType | PreciseNumber,
    sellingPrice: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const costNum =
      cost instanceof PreciseNumber ? cost : new PreciseNumber(cost);
    const priceNum =
      sellingPrice instanceof PreciseNumber
        ? sellingPrice
        : new PreciseNumber(sellingPrice);

    if (priceNum.equals(0)) {
      return new PreciseNumber(0);
    }

    return priceNum.subtract(costNum).divide(priceNum).multiply(100);
  }

  static calculateMarkup(
    cost: number | string | DecimalType | PreciseNumber,
    sellingPrice: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const costNum =
      cost instanceof PreciseNumber ? cost : new PreciseNumber(cost);
    const priceNum =
      sellingPrice instanceof PreciseNumber
        ? sellingPrice
        : new PreciseNumber(sellingPrice);

    if (costNum.equals(0)) {
      return new PreciseNumber(0);
    }

    return priceNum.subtract(costNum).divide(costNum).multiply(100);
  }

  // Interest calculations
  static calculateSimpleInterest(
    principal: number | string | DecimalType | PreciseNumber,
    rate: number | string | DecimalType | PreciseNumber,
    time: number | string | DecimalType | PreciseNumber
  ): PreciseNumber {
    const principalNum =
      principal instanceof PreciseNumber
        ? principal
        : new PreciseNumber(principal);
    const rateNum =
      rate instanceof PreciseNumber ? rate : new PreciseNumber(rate);
    const timeNum =
      time instanceof PreciseNumber ? time : new PreciseNumber(time);

    return principalNum.multiply(rateNum).multiply(timeNum).divide(100);
  }

  static calculateCompoundInterest(
    principal: number | string | DecimalType | PreciseNumber,
    rate: number | string | DecimalType | PreciseNumber,
    time: number | string | DecimalType | PreciseNumber,
    compoundingFrequency: number = 1
  ): PreciseNumber {
    const principalNum =
      principal instanceof PreciseNumber
        ? principal
        : new PreciseNumber(principal);
    const rateNum =
      rate instanceof PreciseNumber ? rate : new PreciseNumber(rate);
    const timeNum =
      time instanceof PreciseNumber ? time : new PreciseNumber(time);
    const frequencyNum = new PreciseNumber(compoundingFrequency);

    // A = P(1 + r/n)^(nt)
    const ratePerPeriod = rateNum.divide(100).divide(frequencyNum);
    const exponent = frequencyNum.multiply(timeNum);
    const base = new PreciseNumber(1).add(ratePerPeriod);

    // For compound interest calculation, we need to use the power function
    const amount = principalNum.multiply(base.pow(exponent.toNumber()));
    return amount.subtract(principalNum);
  }
}

// Utility functions
export function formatCurrency(
  amount: number | string | DecimalType | PreciseNumber,
  currency: string = "$",
  decimalPlaces: number = 2
): string {
  const amountNum =
    amount instanceof PreciseNumber ? amount : new PreciseNumber(amount);
  return `${currency}${amountNum.toFixed(decimalPlaces)}`;
}

export function formatPercentage(
  value: number | string | DecimalType | PreciseNumber,
  decimalPlaces: number = 2
): string {
  const valueNum =
    value instanceof PreciseNumber ? value : new PreciseNumber(value);
  return `${valueNum.toFixed(decimalPlaces)}%`;
}

export function isDecimal(value: any): value is DecimalType {
  return value instanceof Decimal;
}

export function isPreciseNumber(value: any): value is PreciseNumber {
  return value instanceof PreciseNumber;
}

// Export Decimal for direct use when needed
export { Decimal };
export type { DecimalType };
