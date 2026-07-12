// Consistent short date format used across the whole dashboard: M/D/YYYY
export function fmtDate(d) {
  if (!d) return '—';
  let date;
  if (d instanceof Date) {
    date = d;
  } else if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    // ISO date string - parse as local date to avoid timezone shift
    const [y, m, day] = d.split('-').map(Number);
    date = new Date(y, m - 1, day);
  } else {
    date = new Date(d);
  }
  if (isNaN(date.getTime())) return String(d);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
