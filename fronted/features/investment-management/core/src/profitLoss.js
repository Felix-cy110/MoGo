import { formatInvestmentDecimal } from './format.js';

const decimalPattern = /^\d+(?:\.\d+)?$/;
const maximumCalculationDigits = 72;
const powerOfTen = exponent => 10n ** BigInt(exponent);

const parsePositiveDecimal = value => {
  if (typeof value !== 'string' || !decimalPattern.test(value)) return null;
  const [integer, fraction = ''] = value.split('.');
  if (
    integer.length > maximumCalculationDigits ||
    fraction.length > maximumCalculationDigits
  ) return null;
  const coefficient = BigInt(`${integer}${fraction}`);
  return coefficient > 0n ? { coefficient, scale: fraction.length } : null;
};

const roundRatio = (numerator, denominator) => {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
};

const toFixedDecimal = (coefficient, sourceScale, fractionDigits) => {
  const scaled = sourceScale <= fractionDigits
    ? coefficient * powerOfTen(fractionDigits - sourceScale)
    : roundRatio(coefficient, powerOfTen(sourceScale - fractionDigits));
  const digits = scaled.toString().padStart(fractionDigits + 1, '0');
  const integer = digits.slice(0, -fractionDigits);
  const fraction = digits.slice(-fractionDigits);
  return `${integer}.${fraction}`;
};

export const calculateInvestmentProfitLoss = ({ price, summary } = {}) => {
  const currentPrice = parsePositiveDecimal(price);
  const quantity = parsePositiveDecimal(summary?.totalQuantity);
  const cost = parsePositiveDecimal(summary?.totalQuoteAmount);
  const averageEntryPrice = parsePositiveDecimal(summary?.averageEntryPrice);
  if (!currentPrice || !quantity || !cost || !averageEntryPrice) return null;

  const marketValue = {
    coefficient: currentPrice.coefficient * quantity.coefficient,
    scale: currentPrice.scale + quantity.scale,
  };
  const commonScale = Math.max(marketValue.scale, cost.scale);
  const marketValueCoefficient =
    marketValue.coefficient * powerOfTen(commonScale - marketValue.scale);
  const costCoefficient = cost.coefficient * powerOfTen(commonScale - cost.scale);
  const profitLossCoefficient = marketValueCoefficient - costCoefficient;
  const absoluteProfitLoss =
    profitLossCoefficient < 0n ? -profitLossCoefficient : profitLossCoefficient;
  const direction =
    profitLossCoefficient > 0n
      ? 'profit'
      : profitLossCoefficient < 0n
        ? 'loss'
        : 'flat';

  return {
    amount: toFixedDecimal(absoluteProfitLoss, commonScale, 2),
    percentage: toFixedDecimal(
      roundRatio(absoluteProfitLoss * 10000n, costCoefficient),
      2,
      2,
    ),
    direction,
  };
};

export const formatInvestmentProfitLoss = (profitLoss, language) => {
  if (!profitLoss) return null;
  const sign =
    profitLoss.direction === 'profit'
      ? '+'
      : profitLoss.direction === 'loss'
        ? '-'
        : '';
  return {
    ...profitLoss,
    amount: `${sign}${formatInvestmentDecimal(profitLoss.amount, language)}`,
    percentage: `${sign}${formatInvestmentDecimal(profitLoss.percentage, language)}`,
  };
};
