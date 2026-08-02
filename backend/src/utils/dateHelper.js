// Parse a value into a local Date without UTC-midnight timezone shifting.
// DATE-only strings (YYYY-MM-DD) are parsed as local noon to stay on the correct day
// in any timezone. Timestamps and Date objects use their own UTC offset.
const _toDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val);
  // Pure date string — parse parts to avoid UTC midnight drift
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly.map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  // ISO timestamp or anything else — let the engine parse it
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
};

const formatDate = (val) => {
  const date = _toDate(val);
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTime = (val) => {
  if (!val) return 'N/A';
  // Plain TIME string "HH:MM:SS" — parse directly
  if (typeof val === 'string' && /^\d{2}:\d{2}/.test(val)) {
    const [h, m] = val.split(':').map(Number);
    if (isNaN(h)) return 'N/A';
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  const date = val instanceof Date ? val : new Date(String(val));
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatDateTime = (dateVal, timeVal) => {
  const d = formatDate(dateVal);
  if (!timeVal) return d;
  const t = formatTime(timeVal);
  return `${d} at ${t}`;
};

module.exports = { formatDate, formatTime, formatDateTime };
