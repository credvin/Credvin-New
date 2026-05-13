/**
 * Generates a premium Credvin Loan ID from an application record.
 * Format: CVLN-YYYY-XXXXXX (derived deterministically from app id + created_date)
 */
export function generateLoanId(app) {
  if (!app) return '—';
  const year = app.created_date ? new Date(app.created_date).getFullYear() : new Date().getFullYear();
  // Use last 6 chars of id as the unique suffix
  const suffix = (app.id || '').replace(/-/g, '').slice(-6).toUpperCase();
  if (!suffix) return `CVLN-${year}-??????`;
  return `CVLN-${year}-${suffix}`;
}

export function getLoanIdShort(app) {
  if (!app?.id) return '—';
  return (app.id || '').replace(/-/g, '').slice(-8).toUpperCase();
}
