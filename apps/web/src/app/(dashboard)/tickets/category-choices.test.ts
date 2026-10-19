import { describe, expect, it } from 'vitest';
import { categoryChoices } from './category-choices';

describe('categoryChoices', () => {
  const categories = [
    { id: 'cat-1', name: 'Plumbing', display_order: 10, subcategories: [{ id: 'sub-1', name: 'Leak', display_order: 10 }] },
    { id: 'cat-2', name: 'Electrical', display_order: 20 },
  ];

  it("offers the society's own categories by id, in the order given", () => {
    expect(categoryChoices(categories, ['plumbing'])).toEqual([
      { value: 'cat-1', label: 'Plumbing', categoryId: 'cat-1', subcategories: [{ id: 'sub-1', name: 'Leak', display_order: 10 }] },
      { value: 'cat-2', label: 'Electrical', categoryId: 'cat-2', subcategories: [] },
    ]);
  });

  it('offers the plain names while the society has no categories yet', () => {
    expect(categoryChoices([], ['plumbing', 'other'])).toEqual([
      { value: 'plumbing', label: 'plumbing' },
      { value: 'other', label: 'other' },
    ]);
  });

  it('offers nothing before either list has loaded', () => {
    expect(categoryChoices(undefined, undefined)).toEqual([]);
  });
});
