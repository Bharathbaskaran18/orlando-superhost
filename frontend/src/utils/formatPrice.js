/**
 * Format a price value to exactly 2 decimal places with $ prefix.
 * Uses toFixed(2) to eliminate floating-point representation artifacts
 * before converting to locale string so large numbers get comma separators.
 */
export function formatPrice(value) {
  if (value == null || value === '') return '$0.00';
  const fixed = parseFloat(parseFloat(value).toFixed(2));
  return '$' + fixed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Same but without the $ prefix — useful inside strings */
export function fmtNum(value) {
  if (value == null || value === '') return '0.00';
  const fixed = parseFloat(parseFloat(value).toFixed(2));
  return fixed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
