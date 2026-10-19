import type { HelpdeskCategory, HelpdeskSubcategory } from '@/hooks';

/** One entry of the Category filter and of the New Ticket category select. */
export interface CategoryChoice {
  /** Option value: the category id, or the plain name for the legacy list. */
  value: string;
  label: string;
  /** Present when the choice is one of the society's own categories. */
  categoryId?: string;
  /** Its active sub-categories (HELP-17). */
  subcategories?: HelpdeskSubcategory[];
}

/**
 * The society's categories (Setup > Helpdesk Categories), in grid order.
 * A server that does not know them yet answers with an empty list; the
 * plain names from `GET /tickets/categories` are offered instead, so a
 * request can still be raised while the two sides are being updated.
 */
export function categoryChoices(
  categories: readonly HelpdeskCategory[] | undefined,
  legacyNames: readonly string[] | undefined,
): CategoryChoice[] {
  if (categories && categories.length > 0) {
    return categories.map((category) => ({
      value: category.id,
      label: category.name,
      categoryId: category.id,
      subcategories: category.subcategories ?? [],
    }));
  }
  return (legacyNames ?? []).map((name) => ({ value: name, label: name }));
}
