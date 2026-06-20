interface CalculateServiceFinancialsInput {
  priceIn: number;
  priceOut: number;
  exchangeRate: number;
  discountPct: number;
  deductiblePct: number; // from the contract
}

interface ServiceFinancialsResult {
  grossAmount: number; // priceOut before any deductions
  discountAmount: number;
  deductibleAmount: number;
  netPayable: number; // what the insurer actually pays
  margin: number; // priceOut - priceIn (TPA's margin before deductions)
  convertedPriceOut: number; // priceOut converted using exchangeRate
}

/**
 * Core financial calculation engine for a single case service line.
 * This replaces the Lovable prototype, which only displayed hardcoded
 * numbers with no real calculation logic behind them.
 */
export function calculateServiceFinancials(input: CalculateServiceFinancialsInput): ServiceFinancialsResult {
  const { priceIn, priceOut, exchangeRate, discountPct, deductiblePct } = input;

  if (priceIn < 0 || priceOut < 0) {
    throw new Error("priceIn and priceOut must be non-negative");
  }
  if (exchangeRate <= 0) {
    throw new Error("exchangeRate must be positive");
  }
  if (discountPct < 0 || discountPct > 100) {
    throw new Error("discountPct must be between 0 and 100");
  }
  if (deductiblePct < 0 || deductiblePct > 100) {
    throw new Error("deductiblePct must be between 0 and 100");
  }

  const convertedPriceOut = round2(priceOut * exchangeRate);
  const grossAmount = convertedPriceOut;
  const discountAmount = round2(grossAmount * (discountPct / 100));
  const afterDiscount = round2(grossAmount - discountAmount);
  const deductibleAmount = round2(afterDiscount * (deductiblePct / 100));
  const netPayable = round2(afterDiscount - deductibleAmount);
  const margin = round2(convertedPriceOut - priceIn * exchangeRate);

  return {
    grossAmount,
    discountAmount,
    deductibleAmount,
    netPayable,
    margin,
    convertedPriceOut,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Checks net payable against a contract's guaranteed amount cap (if set).
 * Returns the capped amount and whether a cap was applied.
 */
export function applyGuaranteedAmountCap(
  netPayable: number,
  guaranteedAmount: number | null | undefined,
  alreadyUsed: number
): { cappedAmount: number; capApplied: boolean; remainingAfter: number } {
  if (guaranteedAmount === null || guaranteedAmount === undefined) {
    return { cappedAmount: netPayable, capApplied: false, remainingAfter: Infinity };
  }

  const remaining = guaranteedAmount - alreadyUsed;

  if (netPayable > remaining) {
    return {
      cappedAmount: Math.max(remaining, 0),
      capApplied: true,
      remainingAfter: 0,
    };
  }

  return {
    cappedAmount: netPayable,
    capApplied: false,
    remainingAfter: round2(remaining - netPayable),
  };
}

/**
 * Generates a unique invoice number: INV-YYYY-NNNNNN
 */
export function buildInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(6, "0")}`;
}
