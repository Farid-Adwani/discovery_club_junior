import { Product, ProductCategory, ProductOrder } from '../types';

export const PRODUCT_CATEGORIES: ProductCategory[] = ['tshirt', 'hoodie', 'jacket', 'hat', 'bag', 'other'];

export const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  tshirt: '👕',
  hoodie: '🧥',
  jacket: '🧥',
  hat: '🧢',
  bag: '🎒',
  other: '🛍️'
};

/** Stock key used by the server for products sold without sizes */
export const ONE_SIZE = 'ONE';

export const stockKeys = (p: Product) => (p.sizes.length ? p.sizes : [ONE_SIZE]);

export const totalStock = (p: Product) => stockKeys(p).reduce((sum, k) => sum + (p.stock?.[k] ?? 0), 0);

/** Sort key for orders: exact time when known, otherwise the day (older orders) */
export const orderTime = (o: ProductOrder) => o.createdAt || o.requestedAt;
