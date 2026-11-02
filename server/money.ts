// Money is stored as whole millimes (1 DT = 1000 millimes), so sums and comparisons are exact.
// The API still speaks dinars: amounts are converted when read from a request and when sent back.
//
// Each document that holds money says which unit it uses (`moneyUnit: 'millimes'`). Documents written
// before the switch have no marker and hold dinars; they are read correctly until
// `npm run migrate:money` converts them.

export const MONEY_UNIT = 'millimes';

/** Money fields of each collection */
export const MONEY_FIELDS = {
  groups: ['pricePerMonth'],
  students: ['standardMonthlyPrice', 'customMonthlyPrice'],
  payments: ['amountDue', 'amountPaid'],
  cash_entries: ['amount'],
  products: ['price'],
  hoodie_distributions: ['price']
} as const;

export type MoneyCollection = keyof typeof MONEY_FIELDS;

/** Dinars (as typed in a form) to millimes */
export const toMillimes = (dinars: number) => Math.round(dinars * 1000);

/** Millimes to dinars (exact to 3 decimals) */
export const toDinars = (millimes: number) => millimes / 1000;

/** A stored document with its money fields in millimes, whatever unit it was saved in. */
export function readMoney<T>(collection: MoneyCollection, data: T): T {
  const doc = data as Record<string, unknown>;
  if (!doc || doc.moneyUnit === MONEY_UNIT) return data;
  const out: Record<string, unknown> = { ...doc };
  for (const f of MONEY_FIELDS[collection]) {
    if (typeof out[f] === 'number') out[f] = toMillimes(out[f] as number);
  }
  return out as T;
}

/** The fields to save: money already in millimes, plus the unit marker. */
export function writeMoney<T extends object>(data: T): T & { moneyUnit: typeof MONEY_UNIT } {
  return { ...data, moneyUnit: MONEY_UNIT };
}

/**
 * Extra fields for a partial update that writes money to an existing document: an older document
 * gets all its money converted and the marker, so it never mixes dinars and millimes.
 */
export function upgradeMoney(collection: MoneyCollection, stored: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!stored || stored.moneyUnit === MONEY_UNIT) return {};
  const out: Record<string, unknown> = { moneyUnit: MONEY_UNIT };
  for (const f of MONEY_FIELDS[collection]) {
    if (typeof stored[f] === 'number') out[f] = toMillimes(stored[f] as number);
  }
  return out;
}

/** A document (money in millimes) as the API sends it: money in dinars, no marker. */
export function sendMoney<T>(collection: MoneyCollection, data: T): T {
  const { moneyUnit: _unit, ...doc } = data as Record<string, unknown>;
  for (const f of MONEY_FIELDS[collection]) {
    if (typeof doc[f] === 'number') doc[f] = toDinars(doc[f] as number);
  }
  return doc as T;
}
