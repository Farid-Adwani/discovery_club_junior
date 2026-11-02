import type { StockItem, StockStatus } from '../types';

/** States a piece can be in other than available */
export const UNAVAILABLE_STATES = ['in_use', 'maintenance', 'broken', 'lost'] as const;
export type UnavailableState = (typeof UNAVAILABLE_STATES)[number];

/**
 * How many pieces of an item are in each state. `quantity` is the total; the pieces not listed in `units` are available.
 * Items saved before the per-piece states had one `status` for all their pieces.
 */
export function unitBreakdown(it: Pick<StockItem, 'quantity' | 'units' | 'status'>): Record<StockStatus, number> {
  const out: Record<StockStatus, number> = { available: 0, in_use: 0, maintenance: 0, broken: 0, lost: 0 };
  if (it.units) {
    for (const s of UNAVAILABLE_STATES) out[s] = Math.max(0, Math.floor(it.units[s] || 0));
  } else if (it.status && it.status !== 'available') {
    out[it.status] = it.quantity;
  }
  const taken = UNAVAILABLE_STATES.reduce((sum, s) => sum + out[s], 0);
  out.available = Math.max(0, it.quantity - taken);
  return out;
}

export const availableOf = (it: Pick<StockItem, 'quantity' | 'units' | 'status'>) => unitBreakdown(it).available;

/** The `units` field to store: only the states that hold pieces */
export function unitsField(b: Record<StockStatus, number>): StockItem['units'] {
  const units: NonNullable<StockItem['units']> = {};
  for (const s of UNAVAILABLE_STATES) if (b[s] > 0) units[s] = b[s];
  return units;
}
