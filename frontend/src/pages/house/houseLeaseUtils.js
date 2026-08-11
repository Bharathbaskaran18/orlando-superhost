// Shared date/payment-schedule helpers for the house booking flow (Step 1 + Step 3)

export function parseLocal(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function fmtLong(s) {
  if (!s) return '';
  const d = parseLocal(s);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// Add N calendar months to a YYYY-MM-DD string, clamping to the last valid day of the target month.
export function addMonthsClamped(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Month-by-month payment schedule for display (projected, before any payment has been made):
// month 1 is charged today at booking, months 2..N fall due monthly after that.
export function buildDisplaySchedule(moveInDate, numMonths, monthlyRent) {
  if (!moveInDate || !numMonths) return [];
  const rows = [{ monthNumber: 1, dueDate: moveInDate, amount: monthlyRent, dueToday: true }];
  for (let n = 2; n <= numMonths; n++) {
    rows.push({ monthNumber: n, dueDate: addMonthsClamped(moveInDate, n - 1), amount: monthlyRent, dueToday: false });
  }
  return rows;
}
