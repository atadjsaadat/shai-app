-- Clear allergens that were cached as empty before ingredient-text parsing was added.
-- Empty-array entries from the old OFF-tags-only extraction will be re-checked on
-- next scan using the new ingredient-text allergen extraction.
UPDATE barcode_cache
SET allergens = NULL
WHERE allergens = '{}';
