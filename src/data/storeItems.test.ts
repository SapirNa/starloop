import { STORE_ITEMS } from './storeItems';

// Catches authoring mistakes the same way data/levels.test.ts does for
// levels - a bad price or an empty grants list would otherwise only show up
// by actually opening the Store screen.
describe('STORE_ITEMS data integrity', () => {
  it('has unique, non-empty ids', () => {
    const ids = STORE_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  it('every item has a positive price and at least one grant', () => {
    for (const item of STORE_ITEMS) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.grants.length).toBeGreaterThan(0);
      for (const grant of item.grants) {
        expect(grant.amount).toBeGreaterThan(0);
      }
    }
  });

  it('a multi-grant bundle is actually cheaper than buying its contents as separate single-grant items', () => {
    const singleItemPriceByType = new Map<string, number>();
    for (const item of STORE_ITEMS) {
      if (item.grants.length === 1) {
        singleItemPriceByType.set(item.grants[0].type, item.price / item.grants[0].amount);
      }
    }

    for (const item of STORE_ITEMS) {
      if (item.grants.length <= 1) continue;
      const separatePrice = item.grants.reduce((total, grant) => {
        const unitPrice = singleItemPriceByType.get(grant.type);
        expect(unitPrice).toBeDefined();
        return total + (unitPrice ?? 0) * grant.amount;
      }, 0);
      expect(item.price).toBeLessThan(separatePrice);
    }
  });
});
